import { BadRequestException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { CreateTicketDto, SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { DatabaseService } from "@/common/services/database/database.service";
import { uploadMetadata } from "@/lib/irys";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { SupplyDto } from "@/public/events/tickets/dto/supply.dto";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { WhitelistDto } from "@/public/events/tickets/dto/whitelist.dto";
import { UsersService } from "@/public/users/users.service";
import { isEmpty } from "lodash";
import { EmailDto } from "@/common/dto/email.dto";
import { DistributeDto } from "@/public/events/tickets/dto/distribute.dto";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";
import slugify from "slugify";
import { TicketsSnapshotService } from "@/public/events/tickets/services/tickets-snapshot.service";
import { TicketsDistributeService } from "@/public/events/tickets/services/tickets-distribute.service";
import { TicketsDistributeCampaignService } from "@/public/events/tickets/services/tickets-distribute-campaign.service";
import { WebhooksDto } from "@/webhooks/webhooks.dto";
import { envVariables } from "@/common/env-variables";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { stripe } from "@/lib/stripe";
import { EventsService } from "@/public/events/events.service";
import { logoBase64 } from "@/utils/logo_base64";
import { EntranceService } from "@/public/events/entrance/entrance.service";
import { decryptQrCodePayload, encryptQrCodePayload } from "@/utils/eventKey";

@Injectable()
export class TicketsService {
  private readonly stripe: Stripe;

  constructor(
    private database: DatabaseService,
    private usersService: UsersService,
    private eventsService: EventsService,
    private entranceService: EntranceService,
    private ticketSnapshotService: TicketsSnapshotService,
    private ticketDistributeService: TicketsDistributeService,
    private ticketDistributeCampaignService: TicketsDistributeCampaignService
  ) {
    this.stripe = stripe;
  }

  async getEventTickets(appId: string, eventId: string) {
    const readTicketContract = (functionName: string, address: string, args: [] | null = null) => {
      return readContract({
        abi: contractArtifacts["tickets"].abi,
        address,
        functionName: functionName,
        args: args
      });
    };
    const tickets = await this.database.ticket.findMany({
      where: {
        eventId,
        appId,
        address: {
          contains: "0x"
        }
      }
    });
    let formattedTickets = [];
    for (const ticket of tickets) {
      const erc20Decimals = await readContract({
        abi: contractArtifacts["erc20"].abi,
        address: envVariables.erc20Address,
        functionName: "decimals"
      });

      const ticketSupply = await readTicketContract("currentSupply", ticket.address);
      const maxSupply = await readTicketContract("maxSupply", ticket.address);
      const price = await readTicketContract("price", ticket.address);
      const ticketOwners = await this.getTicketHolders(ticket.address, { start: 0, pageSize: Number(ticketSupply) });
      const denominatedPrice = Number(price) / 10 ** Number(erc20Decimals);

      formattedTickets.push({
        ...ticket,
        ticketSupply: Number(ticketSupply),
        maxSupply: Number(maxSupply),
        price: denominatedPrice,
        ticketOwners
      });
    }
    return formattedTickets;
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
    const { developerId, appId, capsuleTokenVaultKey, developerWalletAddress, eventId } = params;

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
        developerId
      },
      include: {
        Event: {
          select: {
            contractAddress: true,
            Stakeholders: {
              where: {
                ticketId: null
              }
            }
          }
        }
      }
    });

    const { metadataUrl, metadataImageUrl } = await uploadMetadata({
      name: createTicketDto.name,
      symbol: createTicketDto.symbol,
      description: createTicketDto.description,
      image: createTicketDto?.imageUrl || logoBase64
    });

    const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
    const ownerSmartWallet = await smartWallet.getAccountAddress();

    const contractName = "tickets";

    const erc20Decimals = await readContract({
      abi: contractArtifacts["erc20"].abi,
      address: envVariables.erc20Address,
      functionName: "decimals"
    });

    let stakeholders = [];
    if (createTicketDto?.stakeholders && !isEmpty(createTicketDto.stakeholders)) {
      stakeholders = await this.eventsService.transformStakeholders(
        createTicketDto.stakeholders,
        appId
      );
    } else {
      stakeholders = ticket.Event.Stakeholders.map(sh => ({
        wallet: sh.walletAddress,
        feePercentage: sh.feePercentage
      }));
    }

    const args = {
      _owner: developerWalletAddress,
      _ownerSmartWallet: ownerSmartWallet,
      _eventAddress: ticket.Event.contractAddress,
      _baseURI: metadataUrl,
      _name: createTicketDto.name,
      _symbol: createTicketDto.symbol,
      _erc20Address: envVariables.erc20Address,
      _price: createTicketDto.price * 10 ** Number(erc20Decimals),
      _initialSupply: createTicketDto.initialSupply,
      _maxSupply: createTicketDto.maxSupply,
      _transferable: createTicketDto.transferable,
      _whitelistOnly: createTicketDto.whitelistOnly,
      _stakeholders: stakeholders
    };

    const contract = await deployContract(contractName, [args]);

    await biconomyMetaTx({
      abi: contractArtifacts["event"].abi,
      address: ticket.Event.contractAddress as PrefixedHexString,
      functionName: "addTicket",
      args: [contract.contractAddr],
      capsuleTokenVaultKey
    });

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
      }
    });
    // 🏗️ TODO: merge logic of EntranceChecker into Event (contract is already done)
    // await this.entranceService.create(ticket.id, { appId, eventId, developerWalletAddress, capsuleTokenVaultKey });

    await this.database.stakeholder.createMany({
      data: stakeholders.map(sh => ({
        walletAddress: sh.wallet,
        feePercentage: sh.feePercentage,
        eventId: eventId,
        ticketId: updatedTicket.id
      }))
    });

    return {
      success: true,
      ticket: { ...updatedTicket, stakeholders: stakeholders },
      contract,
      explorerUrls: {
        contract: getExplorerUrl(contract.contractAddr)
      }
    };
  }

  async supply(supplyDto: SupplyDto, params: {
    ticketContractAddress: string;
    capsuleTokenVaultKey: string;
    developerWalletAddress: string;
  }) {
    const { ticketContractAddress, capsuleTokenVaultKey, developerWalletAddress } = params;
    try {
      const metaTxResult = await biconomyMetaTx({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress as PrefixedHexString,
        functionName: "updateSupply",
        args: [supplyDto.additionalSupply],
        capsuleTokenVaultKey: capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
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
      throw new HttpException(e?.message, 500);
    }
  }

  async whitelist(
    whitelistDto: WhitelistDto,
    req: RequestWithApiKey & TicketValidate
  ) {
    try {
      const { capsuleTokenVaultKey, ticketContractAddress, developerWalletAddress, appId } = req;

      const allEmails = [
        ...whitelistDto.addEmails,
        ...whitelistDto.removeEmails
      ];
      const { users } = await this.usersService.createMany(
        { users: allEmails },
        appId
      );

      const emailToWalletMap = new Map(users.map((account) => [account.email, account.smartWalletAddress]));

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
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress as PrefixedHexString,
        functionName: "updateWhitelist",
        args: [whitelistUpdates],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
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
      throw new HttpException(e.message, 500);
    }
  }

  distribute(
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

  async owners(
    ticketContractAddress: string,
    pagination: { start?: number; pageSize?: number } = {
      start: 0,
      pageSize: 100
    }
  ) {
    try {
      const lowercaseHolders = await this.getTicketHolders(ticketContractAddress, pagination);

      const owners = await this.database.user.findMany({
        where: {
          smartWalletAddress: {
            in: lowercaseHolders
          }
        },
        select: {
          email: true,
          smartWalletAddress: true,
          walletAddress: true,
          id: true
        }
      });

      const foundAddresses = new Set(
        owners.map((owner) => owner.smartWalletAddress.toLowerCase())
      );
      const externalAddresses = lowercaseHolders
        .filter((address) => !foundAddresses.has(address))
        .map((address) => ({ walletAddress: address, external: true }));

      return {
        owners,
        externalAddresses
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async ownerByEmail(
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

      const result = await readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress,
        functionName: "getTokensByUser",
        args: [user.smartWalletAddress]
      });

      return {
        user: {
          hasTicket: !isEmpty(result),
          ...(!isEmpty(result) && {
            ownedIds: [result].map((id) => id.toString())
          }),
          email: user.email,
          walletAddress: user.walletAddress,
          smartWalletAddress: user.smartWalletAddress
        }
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  getAllEventTickets(eventId: string) {
    return this.database.ticket.findMany({
      where: {
        eventId
      }
    });
  }

  async showTicket(
    req: RequestWithApiKey & TicketValidate & EventValidate,
    tokenId: string,
    userId?: string
  ) {
    const { ticketContractAddress, eventId } = req;
    try {
      const eventData = await this.database.event.findUnique({
        where: { id: eventId },
        select: { id: true, name: true }
      });
      const user = await this.database.user?.findUnique({
        where: {
          id: userId
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
      const result = await readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress,
        functionName: "balanceOf",
        args: [user.smartWalletAddress, tokenId]
      });

      return {
        eventName: eventData.name,
        tokenId,
        userWalletAddress: user.walletAddress,
        userEmail: user.email,
        success: true,
        result: Number(result)
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async distributeTicketsToExternalWallets(
    users: { wallet: string; amount: number }[],
    ticketContractAddress: string,
    developerWalletAddress: string,
    capsuleTokenVaultKey: string
  ) {
    try {
      const metaTxResult = await biconomyMetaTx({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress as PrefixedHexString,
        functionName: "distribute",
        args: [users.map((dist) => [dist.wallet, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      return {
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash
          )
        }
      };
    } catch (e) {
      throw new HttpException(e["reason"], 500);
    }
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
              unit_amount: denominatedPrice
            },
            quantity: 1
          }
        ],
        mode: "payment",
        success_url: webhooksDto.successUrl ?? `${envVariables.landingPageUrl}/ticket-purchase-success?email=${encodeURIComponent(user.email)}`,
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
      throw new HttpException(e.message, e.status ?? HttpStatus.BAD_REQUEST);
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
                  include: { Entrance: true }
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
      for (const event of user.Apps.flatMap(app => app.Events)) {
        const { Tickets, ...eventData } = event;
        const eventKey = await this.database.eventKey.findUnique({ where: { eventId: event.id } });
        let ownedTicketsOfEvent = [];
        let hasEventEntry = false;

        for (const ticket of event.Tickets) {
          const { Entrance, ...ticketData } = ticket;
          const ownedTokens = await readContract({
            abi: contractArtifacts["tickets"].abi,
            address: ticket.address,
            functionName: "getTokensByUser",
            args: [user.smartWalletAddress]
          }) as BigInt[];
          const ownedTokenIds = ownedTokens.map(i => Number(i));
          let usedTokenIds = [];
          if (ticket?.Entrance) {
            const entranceEntries = await readContract({
              abi: contractArtifacts["entrance"].abi,
              address: ticket.Entrance.address,
              functionName: "getEntries",
              args: []
            }) as { ticketId: BigInt, timestamp: BigInt, wallet: string }[];
            const usedToken = entranceEntries.find((entry: any) => ownedTokenIds.includes(Number(entry?.ticketId)));

            if (!!usedToken?.ticketId) {
              usedTokenIds.push(Number(usedToken?.ticketId));
            }
            hasEventEntry = usedToken?.wallet?.toLowerCase() === user.smartWalletAddress.toLowerCase();
          }
          if (!!ownedTokenIds.length) {
            const qrCodesPerToken = [];
            for (const tokenId of ownedTokenIds) {
              qrCodesPerToken.push({
                code: encryptQrCodePayload({
                  eventId: eventData.id,
                  ticketId: ticketData.id,
                  ticketHolderId: user.id,
                  tokenId
                }, eventKey.key),
                tokenId,
                eventId: eventData.id,
                ticketId: ticketData.id
              });
            }
            ownedTicketsOfEvent.push({
              ticket: ticketData,
              usedTokenIds,
              ownedTokenIds,
              qrCodesPerToken
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
      throw new HttpException(e.message, 500);
    }
    return ownedTickets;
  }

  eventTicketEntries(ticketId: string) {
    return this.entranceService.entries(ticketId);
  }

  async verifyUserTicket(body: { code: string, eventId: string, ticketId: string }, bouncerId: string) {
    const { code, eventId, ticketId } = body;
    const bouncerData = await this.database.user.findUnique({ where: { id: bouncerId }, include: { EventBouncers: { include: { Event: { include: { Tickets: true } } } } } });

    if (!bouncerData.EventBouncers.some(eventBouncer => eventBouncer.eventId === eventId && eventBouncer.Event.Tickets.some(ticket => ticket.id === ticketId))) {
      throw new HttpException("User is not allowed to verify tickets", 403);
    }
    const eventKey = await this.database.eventKey.findUnique({ where: { eventId } });
    const decodedCodeData = decryptQrCodePayload(code, eventKey.key);
    if (!decodedCodeData?.ticketHolderId) {
      throw new BadRequestException("Invalid QR code");
    }
    return this.entranceService.entry(decodedCodeData);
  }
  private async getTicketHolders(
    ticketContractAddress: string,
    pagination: { start?: number; pageSize?: number } = {
      start: 0,
      pageSize: 100
    }
  ) {
    const pageSize = pagination.pageSize || 100;
    let allHolders = [];
    let start = pagination.start || 0;
    try {
      while (true) {
        try {
          const holders: any = await readContract({
            abi: contractArtifacts["tickets"].abi,
            address: ticketContractAddress,
            functionName: "getTicketHolders",
            args: [start, pageSize]
          });
          allHolders = allHolders.concat(holders);
          start += holders.length;

          if (holders.length < pageSize) {
            break;
          }
        } catch (error) {
          console.error("Error fetching ticket holders:", error);
          break;
        }
      }
      return allHolders.map((a: string) => a.toLowerCase());
    } catch (error) {
      console.error("Error fetching ticket holders:", error);
      return [];
    }
  }
}
