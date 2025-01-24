import { EmailDto } from "@/common/dto/email.dto";
import { envVariables } from "@/common/env-variables";
import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { biconomyMetaTx } from "@/lib/biconomy";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";
import { fetchSubgraphData } from "@/lib/graph";
import { uploadMetadata } from "@/lib/irys";
import { stripe } from "@/lib/stripe";
import { contractArtifacts, getExplorerUrl, readContract, writeContract } from "@/lib/viem";
import { EventsService } from "@/routes/events/events.service";
import { StakeholdersService } from "@/routes/stakeholders/stakeholders.service";
import { CreateTicketDto, SnapshotDto } from "@/routes/tickets/dto/create-ticket.dto";
import { DistributeDto } from "@/routes/tickets/dto/distribute.dto";
import { SupplyDto } from "@/routes/tickets/dto/supply.dto";
import { WhitelistDto } from "@/routes/tickets/dto/whitelist.dto";
import { TicketsDistributeCampaignService } from "@/routes/tickets/services/tickets-distribute-campaign.service";
import { TicketsDistributeService } from "@/routes/tickets/services/tickets-distribute.service";
import { TicketsSnapshotService } from "@/routes/tickets/services/tickets-snapshot.service";
import { UsersService } from "@/routes/users/users.service";
import { WebhooksDto } from "@/routes/webhooks/dto/webhooks.dto";
import { decryptQrCodePayload, encryptQrCodePayload } from "@/utils/eventKey";
import { logoBase64 } from "@/utils/logo_base64";
import { BadRequestException, forwardRef, HttpException, Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PaymentMethod } from "@prisma/client";
import { PrefixedHexString } from "ethereumjs-util";
import { isEmpty, omit } from "lodash";
import slugify from "slugify";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { parseEventLogs } from "viem";

@Injectable()
export class TicketsService {
  private readonly stripe: Stripe;

  constructor(
    private database: DatabaseService,
    private eventEmitter: EventEmitter2,
    private usersService: UsersService,
    private eventsService: EventsService,
    private ticketSnapshotService: TicketsSnapshotService,
    private ticketDistributeService: TicketsDistributeService,
    @Inject(forwardRef(() => TicketsDistributeCampaignService))
    private ticketDistributeCampaignService: TicketsDistributeCampaignService,
    private stakeholdersService: StakeholdersService
  ) {
    this.stripe = stripe;
  }

  async create(
    createTicketDto: CreateTicketDto,
    params: {
      developerId: string;
      appId: string;
      capsuleTokenVaultKey: string;
      developerWalletAddress: string;
      eventId: string;
    }
  ) {
    const {
      developerId,
      appId,
      capsuleTokenVaultKey,
      developerWalletAddress,
      eventId
    } = params;

    const slug = slugify(createTicketDto.name, {
      lower: true,
      strict: true,
      trim: true
    });
    const ticket = await this.database.ticket.create({
      data: {
        address: `${uuidv4()}-${new Date().getTime()}`,
        name: createTicketDto.name,
        metadataUrl: "",
        slug,
        metadataPayload: {},
        appId,
        eventId,
        developerId,
        paymentMethods: createTicketDto.paymentMethods
      },
      include: {
        Event: {
          select: {
            address: true,
            Stakeholders: {
              where: {
                ticketId: null
              }
            }
          }
        }
      }
    });

    const { metadataUrl, metadataImageUrl, totalWeiPrice } = await uploadMetadata({
      name: createTicketDto.name,
      symbol: createTicketDto.symbol,
      description: createTicketDto.description,
      image: createTicketDto?.imageUrl || logoBase64
    });

    this.eventEmitter.emit("interaction.create", {
      method: "uploadMetadata-ticket",
      gasWeiPrice: totalWeiPrice,
      developerId,
      eventId,
      txHash: "none",
      operatorType: "irys"
    });

    const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
    const ownerSmartWallet = await smartWallet.getAccountAddress();

    const erc20Decimals = await readContract({
      abi: contractArtifacts["erc20"].abi,
      address: envVariables.erc20Address,
      functionName: "decimals"
    });

    let stakeholders: any[] = [];
    if (
      createTicketDto?.stakeholders &&
      !isEmpty(createTicketDto.stakeholders)
    ) {
      const stakeholdersAccounts =
        await this.usersService.createManyUserAccounts(
          {
            users: createTicketDto.stakeholders.map((sh) => ({
              email: sh.email
            }))
          },
          appId
        );
      const stakeholdersWithUserData = stakeholders.map((sh) => {
        const user =
          stakeholdersAccounts.users.find((user) => user.email === sh.email) ||
          {};
        return {
          ...sh,
          ...user
        };
      }) as {
        id: string;
        email: string;
        walletAddress: string;
        smartWalletAddress: string;
        feePercentage: number;
        paymentMethods: PaymentMethod[];
      }[];
      stakeholders = stakeholdersWithUserData;
      await this.stakeholdersService.createStakeholder(
        createTicketDto.stakeholders,
        {
          appId,
          eventId,
          ticketId: ticket.id
        }
      );
    }

    const args = {
      _owner: developerWalletAddress,
      _ownerSmartWallet: ownerSmartWallet,
      _eventAddress: ticket.Event.address,
      _baseURI: metadataUrl,
      _name: createTicketDto.name,
      _symbol: createTicketDto.symbol,
      _erc20Address: envVariables.erc20Address,
      _price: createTicketDto.price * 10 ** Number(erc20Decimals),
      _initialSupply: createTicketDto.initialSupply,
      _maxSupply: createTicketDto.maxSupply,
      _transferable: createTicketDto.transferable,
      _whitelistOnly: createTicketDto.whitelistOnly,
      _stakeholders: stakeholders.map((sh) => ({
        wallet: sh.walletAddress,
        feePercentage: sh.feePercentage
      }))
    };

    const deployTicketResult = await writeContract({
      abi: contractArtifacts["tickets-factory"].abi,
      address: envVariables.ticketsFactoryAddress,
      functionName: "deployTicket",
      args: [args]
    });

    const logs = parseEventLogs({
      abi: contractArtifacts["tickets-factory"].abi,
      logs: deployTicketResult.logs
    });

    const newTicketDeployedEventArgs = logs
      .filter((log) => (log as any) !== "NewTicketDeployed")
      .map((log) => (log as any)?.args);

    const contract = {
      contractAddr: newTicketDeployedEventArgs
        .find(args => args.ownerSmartWallet === ownerSmartWallet)?.ticketAddress
        .toLowerCase(),
      gasWeiPrice: deployTicketResult.gasWeiPrice,
      hash: deployTicketResult.transactionHash
    };

    this.eventEmitter.emit("ticket.create", {
      eventAddress: ticket.Event.address,
      ticketAddress: contract.contractAddr,
      capsuleTokenVaultKey,
      developerId,
      eventId
    });

    this.eventEmitter.emit("interaction.create", {
      method: "deployTicketContract",
      gasWeiPrice: contract.gasWeiPrice,
      developerId,
      eventId,
      txHash: contract.hash,
      operatorType: "operator"
    });

    if (!!createTicketDto?.ticketRewards?.length) {
      const templates = await this.database.discount.findMany({
        where: {
          id: {
            in: createTicketDto.ticketRewards
          }
        }
      });

      await this.database.discount.createMany({
        data: templates.map((template) => ({
          ...omit(template, ["id"]),
          templateId: template.id,
          appId,
          eventId,
          ticketId: ticket.id
        }))
      });
    }

    const updatedTicket = await this.database.ticket.update({
      where: {
        id: ticket.id
      },
      data: {
        address: contract.contractAddr,
        metadataUrl,
        metadataPayload: {
          name: createTicketDto.name,
          symbol: createTicketDto.symbol,
          description: createTicketDto.description,
          ...(metadataImageUrl && { metadataImageUrl })
        }
      },
      include: {
        Stakeholders: true,
        Discounts: true
      }
    });

    return {
      success: true,
      ticket: updatedTicket,
      contract,
      explorerUrls: {
        contract: getExplorerUrl(contract.contractAddr)
      }
    };
  }

  getTicketDetailsForPurchase(eventId: string, ticketId: string) {
    return this.database.ticket.findUnique({
      where: {
        id: ticketId,
        eventId
      },
      include: {
        Event: true
      }
    });
  }

  async getTicketDetails(req: RequestWithApiKey & TicketValidate) {
    const { ticketContractAddress, appId, ticketId } = req;

    const app = await this.database.app.findUnique({
      where: {
        id: appId
      }
    });

    const sc = await this.database.ticket.findUnique({
      where: {
        id: ticketId
      },
      include: {
        Event: {
          select: {
            name: true
          }
        }
      }
    });

    const readTicketContract = (
      functionName: string,
      args: [] | null = null
    ) => {
      return readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress,
        functionName: functionName,
        args: args
      });
    };

    const name = await readTicketContract("name");
    const price = await readTicketContract("price");
    const currentSupply = await readTicketContract("currentSupply");
    const totalSupply = await readTicketContract("totalSupply");
    const initialSupply = await readTicketContract("initialSupply");
    const transferable = await readTicketContract("transferable");
    const whitelistOnly = await readTicketContract("whitelistOnly");
    const nextTokenId = await readTicketContract("nextTokenId");

    return {
      smartContractAddress: ticketContractAddress,
      applicationName: app.name,
      applicationDescription: app.description,
      eventName: sc.Event.name,
      ticketName: name,
      ticketDescription: (sc as any)?.metadataPayload?.description,
      ticketImage: (sc as any)?.metadataPayload?.metadataImageUrl,
      ticketId,
      price: Number(price) ?? 0,
      initialSupply: Number(initialSupply),
      currentSupply: Number(currentSupply),
      totalSupply: Number(totalSupply),
      tokensSold: Number(nextTokenId),
      transferable,
      whitelistOnly,
      createdAt: new Date(sc.createdAt)
    };
  }

  async getAllEventTicketsWithOnchainData(appId: string, eventId: string) {
    const readTicketContract = (functionName: string, address: string) => {
      return readContract({
        abi: contractArtifacts["tickets"].abi,
        address,
        functionName: functionName
      });
    };

    const tickets = await this.database.ticket.findMany({
      where: {
        eventId,
        appId,
        address: {
          contains: "0x"
        }
      },
      include: {
        Discounts: true
      }
    });

    const erc20Decimals = await readContract({
      abi: contractArtifacts["erc20"].abi,
      address: envVariables.erc20Address,
      functionName: "decimals"
    });

    const ticketAddresses = tickets.map(t => t.address);
    const ticketHoldersData = await this.getTicketHolders(ticketAddresses);
    const ticketHoldersMap = Object.fromEntries(
      ticketAddresses.map(address => [address, []])
    );

    ticketHoldersData.forEach(holder => {
      ticketHoldersMap[holder.ticket.address]?.push(holder);
    });

    const formattedTicketsPromises = tickets.map(async (ticket) => {
      const [ticketSupply, maxSupply, price] = await Promise.all([
        readTicketContract("currentSupply", ticket.address),
        readTicketContract("maxSupply", ticket.address),
        readTicketContract("price", ticket.address)
      ]);

      const denominatedPrice = Number(price) / 10 ** Number(erc20Decimals);

      return {
        ...ticket,
        ticketSupply: Number(ticketSupply),
        maxSupply: Number(maxSupply),
        price: denominatedPrice,
        ticketOwners: ticketHoldersMap[ticket.address] || []
      };
    });

    return Promise.all(formattedTicketsPromises);
  }

  async snapshot(snapshotDto: SnapshotDto) {
    return this.ticketSnapshotService.snapshot(snapshotDto);
  }

  distributeCampaignTickets(
    campaignId: string,
    appId: string,
    req: {
      capsuleTokenVaultKey: string;
      developerWalletAddress: string;
    }
  ) {
    return this.ticketDistributeCampaignService.distribute(
      campaignId,
      appId,
      req
    );
  }

  async changeSupply(
    supplyDto: SupplyDto,
    params: {
      ticketContractAddress: string;
      capsuleTokenVaultKey: string;
      developerWalletAddress: string;
      developerId: string;
      ticketId: string;
    }
  ) {
    const {
      ticketContractAddress,
      capsuleTokenVaultKey,
      developerWalletAddress,
      developerId,
      ticketId
    } = params;
    try {
      const metaTxResult = await biconomyMetaTx({
        contractName: "tickets",
        address: ticketContractAddress as PrefixedHexString,
        functionName: "updateSupply",
        args: [supplyDto.additionalSupply],
        capsuleTokenVaultKey: capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      this.eventEmitter.emit("interaction.create", {
        method: `updateSupply-ticket`,
        gasWeiPrice: metaTxResult.data.actualGasCost,
        txHash: metaTxResult.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        ticketId,
        developerId
      });

      return {
        success: true,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash
          )
        },
        transactionReceipt: metaTxResult.data.transactionReceipt
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async changeTicketWhitelist(
    whitelistDto: WhitelistDto,
    req: RequestWithApiKey & TicketValidate
  ) {
    try {
      const {
        capsuleTokenVaultKey,
        ticketContractAddress,
        developerWalletAddress,
        appId,
        ticketId,
        developerId
      } = req;

      const allEmails = [
        ...whitelistDto.addEmails,
        ...whitelistDto.removeEmails
      ];
      const { users } = await this.usersService.createManyUserAccounts(
        { users: allEmails },
        appId
      );

      const emailToWalletMap = new Map(
        users.map((account) => [account.email, account.smartWalletAddress])
      );

      const whitelistUpdates = [
        ...whitelistDto.addEmails.map((user) => {
          const walletAddress = emailToWalletMap.get(user.email);
          return walletAddress ? [walletAddress, true] : null;
        }),
        ...(whitelistDto.removeEmails || []).map((user) => {
          const walletAddress = emailToWalletMap.get(user.email);
          return walletAddress ? [walletAddress, false] : null;
        })
      ].filter((item): item is [string, boolean] => item !== null);

      const metaTxResult = await biconomyMetaTx({
        contractName: "tickets",
        address: ticketContractAddress as PrefixedHexString,
        functionName: "updateWhitelist",
        args: [whitelistUpdates],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      this.eventEmitter.emit("interaction.create", {
        method: `updateWhitelist-ticket`,
        gasWeiPrice: metaTxResult.data.actualGasCost,
        txHash: metaTxResult.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        ticketId,
        developerId
      });

      const updatedUsersWhitelist = users.filter((user) => ({
        email: user.email,
        walletAddress: user.smartWalletAddress
      }));
      const usersAndUpdatedWhitelistStatus = whitelistUpdates.map(
        (whitelistUpdate) => {
          const [walletAddress, isWhitelisted] = whitelistUpdate;
          const user = updatedUsersWhitelist.find(
            (user) => user.smartWalletAddress === walletAddress
          );
          return {
            email: user?.email,
            walletAddress,
            isWhitelisted
          };
        }
      );
      return {
        success: true,
        whitelistUsersUpdate: usersAndUpdatedWhitelistStatus,
        transactionReceipt: metaTxResult.data.transactionReceipt,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash
          )
        }
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  distributeTickets(
    distributeDto: DistributeDto,
    params: {
      ticketContractAddress: string;
      eventId: string;
      appId: string;
      ticketId: string;
      capsuleTokenVaultKey: string;
      developerWalletAddress: string;
    }
  ) {
    return this.ticketDistributeService.distribute(distributeDto, params);
  }

  async getTicketOwners(ticketContractAddresses: PrefixedHexString[]) {
    try {
      return this.getTicketHolders(ticketContractAddresses);
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async getTicketOwnersByEmail(
    email: EmailDto["email"],
    req: RequestWithApiKey & TicketValidate
  ) {
    const { ticketContractAddress } = req;

    try {
      const user = await this.database.user.findUnique({
        where: {
          email
        },
        select: {
          email: true,
          walletAddress: true,
          smartWalletAddress: true
        }
      });

      if (!user) {
        throw new Error("User does not exist");
      }

      const result = await this.getTicketHolders([ticketContractAddress], user.smartWalletAddress);
      return {
        user: {
          hasTicket: !isEmpty(result?.ownedTokenIds),
          ...(!isEmpty(result?.ownedTokenIds) && {
            ownedIds: result?.ownedTokenIds?.map((id) => id.toString())
          }),
          email: user.email,
          walletAddress: user.walletAddress,
          smartWalletAddress: user.smartWalletAddress
        }
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  getAllEventTickets(eventId: string) {
    return this.database.ticket.findMany({
      where: {
        eventId
      }
    });
  }

  async distributeTicketsToExternalWallets(
    users: { wallet: string; amount: number }[],
    ticketContractAddress: string,
    developerWalletAddress: string,
    capsuleTokenVaultKey: string
  ) {
    try {
      const developer = await this.database.developer.findUnique({
        where: { walletAddress: developerWalletAddress },
        select: { id: true }
      });
      const ticket = await this.database.ticket.findUnique({
        where: { address: ticketContractAddress },
        select: { id: true, Event: { select: { id: true } } }
      });
      const metaTxResult = await biconomyMetaTx({
        contractName: "tickets",
        address: ticketContractAddress as PrefixedHexString,
        functionName: "distribute",
        args: [users.map((dist) => [dist.wallet, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      this.eventEmitter.emit("interaction.create", {
        method: `distribute-ticket`,
        gasWeiPrice: metaTxResult.data.actualGasCost,
        txHash: metaTxResult.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        ticketId: ticket.id,
        developerId: developer.id,
        eventId: ticket.Event.id
      });

      return {
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash
          )
        }
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async getCheckoutSession(webhooksDto: WebhooksDto) {
    try {
      const user = await this.database.user.findUnique({
        where: {
          id: webhooksDto.userId
        },
        select: {
          id: true,
          smartWalletAddress: true,
          email: true
        }
      });

      const ticket = await this.database.ticket.findUnique({
        where: {
          id: webhooksDto.ticketId
        },
        include: {
          Event: {
            select: {
              name: true
            }
          }
        }
      });

      const price = await readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticket.address,
        functionName: "price"
      });

      const erc20Decimals = await readContract({
        abi: contractArtifacts["erc20"].abi,
        address: envVariables.erc20Address,
        functionName: "decimals"
      });

      const denominatedPrice = Number(price) / 10 ** Number(erc20Decimals);
      console.log("🏷️ price", price);
      console.log("🏷️ denominatedPrice", denominatedPrice);
      console.log("💯 erc20Decimals", erc20Decimals);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${ticket.Event.name} ticket (${ticket.name})`,
                images: ["https://avatars.githubusercontent.com/u/164048341"]
              },
              unit_amount: 100
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url:
          webhooksDto.successUrl ??
          `${envVariables.ticketerAppUrl}/?ticketId=${ticket.id}`,
        // cancel_url: webhooksDto.cancelUrl ?? req.get("host"),
        payment_intent_data: {
          metadata: {
            userSmartWalletAddress: user.smartWalletAddress,
            ticketAddress: ticket.address,
            userId: user.id,
            ticketId: ticket.id
          }
        }
      });

      console.log("💳 checkout session: ", session);

      return session;
    } catch (e: any) {
      console.log("🚨 error on /checkout-session", e.message);
      throw new CustomHttpException(e);
    }
  }

  async getOwnedTickets(userId: string) {
    const user = await this.database.user.findUnique({
      where: {
        id: userId
      },
      include: {
        Apps: {
          include: {
            Events: {
              include: {
                EventLocation: true,
                Tickets: {
                  where: { address: { contains: "0x" } },
                  include: { Event: true }
                }
              }
            }
          }
        }
      }
    });
    if (!user) {
      throw new HttpException("User does not exist", 404);
    }
    let ownedTickets = [];

    try {
      const ownedTokens = await this.getTicketHolders(
        user.Apps
          .flatMap((app) => app.Events)
          .flatMap((event) => event.Tickets.map((ticket) => ticket.address)
          ),
        user.smartWalletAddress
      );
      for (const event of user.Apps.flatMap((app) => app.Events)) {
        const { Tickets, ...eventData } = event;
        let ownedTicketsOfEvent = [];
        let hasEventEntry = false;

        for (const ticket of event.Tickets) {
          const { Event, ...ticketData } = ticket;

          const ownedTokenIds = ownedTokens
            .find((token) => token.ticket.id === ticket.address)
            ?.ownedTokenIds.map((i) => Number(i));

          let usedTokenIds = [];
          if (ticket?.Event) {
            const entranceEntries = (await readContract({
              abi: contractArtifacts["event"].abi,
              address: ticket.Event.address,
              functionName: "entries",
              args: [user.smartWalletAddress]
            })) as { ticketId: BigInt; timestamp: BigInt; wallet: string }[];

            const usedToken = entranceEntries.find((entry: any) =>
              ownedTokenIds.includes(Number(entry?.ticketId))
            );

            if (!!usedToken?.ticketId) {
              usedTokenIds.push(Number(usedToken?.ticketId));
            }
            hasEventEntry =
              usedToken?.wallet?.toLowerCase() ===
              user.smartWalletAddress;
          }
          if (!!ownedTokenIds.length) {
            ownedTicketsOfEvent.push({
              ticket: ticketData,
              usedTokenIds,
              ownedTokenIds
            });
          }
        }
        if (!!ownedTicketsOfEvent.length) {
          ownedTickets.push({
            event: eventData,
            ownedTicketsOfEvent,
            hasEventEntry
          });
        }
      }
    } catch (e) {
      console.log(e);
      throw new CustomHttpException(e);
    }
    return ownedTickets;
  }

  async getTicketQrCode(params: {
    ticketId: string;
    eventId: string;
    userId: string;
    userSmartWalletAddress: string;
    tokenId: number;
  }) {
    const { ticketId, eventId, userId, userSmartWalletAddress, tokenId } =
      params;
    const ticket = await this.database.ticket.findUnique({
      where: { id: ticketId, eventId },
      include: { Event: { select: { id: true, EventKey: true } } }
    });
    if (!ticket) {
      throw new HttpException("Ticket not found", 404);
    }
    const ownedTokensRes = await this.getTicketHolders(
      [ticket.address],
      userSmartWalletAddress
    );

    const ownedTokens = ownedTokensRes?.[0]?.ownedTokenIds?.map((i: BigInt) => Number(i)) || [];
    if (!ownedTokens.includes(tokenId)) {
      throw new HttpException("User does not own this token", 403);
    }

    return {
      code: encryptQrCodePayload(
        {
          eventId: ticket.eventId,
          ticketId: ticket.id,
          ticketHolderId: userId,
          tokenId,
          timestamp: new Date().getTime()
        },
        ticket.Event.EventKey.key
      ),
      tokenId,
      eventId: ticket.eventId,
      ticketId: ticket.id,
      validBySeconds: 10
    };
  }

  getTicketEntries(ticketId: string) {
    return this.eventsService.getEventEntriesPerTicketId(ticketId);
  }

  async verifyUserTicketAndMakeEventEntry(
    body: { code: string; eventId: string; ticketId: string },
    bouncerId: string
  ) {
    const { code, eventId, ticketId } = body;
    const eventKey = await this.database.eventKey.findUnique({
      where: { eventId }
    });
    const decodedCodeData = decryptQrCodePayload(code, eventKey.key);
    const { timestamp } = decodedCodeData;
    if (new Date().getTime() - timestamp > 11500) {
      throw new BadRequestException("QR code is expired");
    }
    if (!decodedCodeData?.ticketHolderId) {
      throw new BadRequestException("Invalid QR code");
    }
    const bouncerData = await this.database.user.findUnique({
      where: { id: bouncerId },
      include: {
        EventBouncers: { include: { Event: { include: { Tickets: true } } } }
      }
    });
    const bouncerEvents = bouncerData.EventBouncers.flatMap((i) => i.Event);
    const bouncerEventTickets = bouncerEvents.flatMap((i) => i.Tickets);

    if (
      !(
        bouncerEvents.some((i) => i.id === eventId) &&
        bouncerEventTickets.some((i) => i.id === ticketId)
      )
    ) {
      throw new HttpException("User is not allowed to verify tickets", 403);
    }
    return this.eventsService.letUserIntoEvent(bouncerId, decodedCodeData);
  }

  private async getTicketHolders(
    ticketContractAddresses: PrefixedHexString[],
    userAddress?: string
  ) {
    const subgraphRequestBody = {
      query: `
      query TicketHolders($ticketContractAddresses: [String!]!, $userAddress: String) {
        ticketHolders(
          where: {
            ticket_: {address_in: $ticketContractAddresses}
            ${userAddress ? ", address: $userAddress" : ""}
          }
          orderBy: ticket__createdAt
          orderDirection: desc
        ) {
          ownedTokenIds
          address
          ticket {
            address
          }
        }
      }
    `,
      operationName: "TicketHolders",
      variables: {
        ticketContractAddresses,
        userAddress
      }
    };

    const { data } = await fetchSubgraphData(subgraphRequestBody);
    return data.ticketHolders;
  }
}