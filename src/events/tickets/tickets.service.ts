import { HttpException, Injectable } from '@nestjs/common';
import { CreateTicketDto } from '@/events/tickets/dto/create-ticket.dto';
import { DatabaseService } from '@/common/services/database/database.service';
import { uploadMetadata } from '@/lib/irys';
import {
  contractArtifacts,
  deployContract,
  getExplorerUrl,
  readContract,
} from '@/lib/viem';
import { SupplyDto } from '@/events/tickets/dto/supply.dto';
import { biconomyMetaTx } from '@/lib/biconomy';
import { PrefixedHexString } from 'ethereumjs-util';
import { WhitelistDto } from '@/events/tickets/dto/whitelist.dto';
import { UsersService } from '@/users/users.service';
import { EmailService } from '@/common/services/email/email.service';
import { isEmpty } from 'lodash';
import { EmailDto } from '@/common/dto/email.dto';
import { parseEventLogs } from 'viem';
import { envVariables } from '@/common/env-variables';
import { DistributeDto } from '@/events/tickets/dto/distribute.dto';
import { getSmartWalletForCapsuleWallet } from '@/lib/capsule';
import { WebhooksDto } from '@/webhooks/webhooks.dto';
import Stripe from 'stripe';

@Injectable()
export class TicketsService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService,
    private emailService: EmailService,
  ) {}

  async create(
    createTicketDto: CreateTicketDto,
    req: RequestWithApiKey & EventValidate,
  ) {
    try {
      const {
        developerId,
        appId,
        capsuleTokenVaultKey,
        developerWalletAddress,
      } = req;
      const { metadataUrl, metadataImageUrl } = await uploadMetadata({
        name: createTicketDto.name,
        symbol: createTicketDto.symbol,
        description: createTicketDto.description,
        image: '',
      });

      const smartWallet =
        await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();

      console.log('🔥 ownerSmartWallet: ', ownerSmartWallet);

      const contractName = 'tickets';

      console.log('🐥 envVariables.erc20Address: ', envVariables.erc20Address);

      const erc20Decimals = await readContract(
        envVariables.erc20Address,
        contractArtifacts['erc20'].abi,
        'decimals',
      );

      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet,
        baseURI: metadataUrl,
        name: createTicketDto.name,
        symbol: createTicketDto.symbol,
        erc20Address: envVariables.erc20Address,
        price: createTicketDto.price * 10 ** Number(erc20Decimals),
        initialSupply: createTicketDto.initialSupply,
        maxSupply: createTicketDto.maxSupply,
        transferable: createTicketDto.transferable,
        whitelistOnly: createTicketDto.whitelistOnly,
      };

      console.log('🐮 args: ', args);

      const contract = await deployContract(contractName, Object.values(args));
      console.log(
        '⛓️ Contract Explorer URL: ',
        getExplorerUrl(contract.contractAddr),
      );

      const maxId = await this.database.smartContract.aggregate({
        where: {
          appId,
          developerId,
          name: contractName,
        },
        _max: {
          version: true,
        },
      });

      const nextId = (maxId._max.version || 0) + 1;
      const ticket = await this.database.smartContract.create({
        data: {
          address: contract.contractAddr,
          name: contractName,
          version: nextId,
          metadataUrl,
          metadataPayload: {
            name: createTicketDto.name,
            symbol: createTicketDto.symbol,
            description: createTicketDto.description,
            ...(metadataImageUrl && { metadataImageUrl }),
          },
          App: { connect: { id: appId } },
          Event: { connect: { id: req.eventId } },
          DevelopersAccount: { connect: { id: req.developerId } },
        },
      });
      return {
        success: true,
        ticketId: ticket.id,
        ticket,
        contract,
        explorerUrls: {
          contract: getExplorerUrl(contract.contractAddr),
        },
      };
    } catch (e) {
      throw new HttpException(e?.message, 500);
    }
  }

  async supply(supplyDto: SupplyDto, req: RequestWithApiKey & TicketValidate) {
    const {
      ticketContractAddress,
      capsuleTokenVaultKey,
      developerWalletAddress,
    } = req;
    try {
      const metaTxResult = await biconomyMetaTx({
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: 'tickets',
        functionName: 'updateSupply',
        args: [supplyDto.additionalSupply],
        capsuleTokenVaultKey: capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress,
      });

      return {
        success: true,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash,
          ),
        },
        transactionReceipt: metaTxResult.data.transactionReceipt,
      };
    } catch (e) {
      throw new HttpException(e?.message, 500);
    }
  }

  async whitelist(
    whitelistDto: WhitelistDto,
    req: RequestWithApiKey & TicketValidate,
  ) {
    try {
      const {
        capsuleTokenVaultKey,
        ticketContractAddress,
        developerWalletAddress,
        appId,
      } = req;
      const allEmails = [
        ...whitelistDto.addEmails,
        ...whitelistDto.removeEmails,
      ];
      const { users } = await this.usersService.createMany(
        { users: allEmails },
        appId,
      );

      const emailToWalletMap = new Map(
        users.map((account) => [account.email, account.smartWalletAddress]),
      );

      const whitelistUpdates = [
        ...whitelistDto.addEmails.map((user) => {
          const walletAddress = emailToWalletMap.get(user.email);
          return walletAddress ? [walletAddress, true] : null;
        }),
        ...(whitelistDto.removeEmails || []).map((user) => {
          const walletAddress = emailToWalletMap.get(user.email);
          return walletAddress ? [walletAddress, false] : null;
        }),
      ].filter((item): item is [string, boolean] => item !== null);

      const metaTxResult = await biconomyMetaTx({
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: 'tickets',
        functionName: 'updateWhitelist',
        args: [whitelistUpdates],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress,
      });
      const updatedUsersWhitelist = users.filter((user) => ({
        email: user.email,
        walletAddress: user.smartWalletAddress,
      }));
      const usersAndUpdatedWhitelistStatus = whitelistUpdates.map(
        (whitelistUpdate) => {
          const [walletAddress, isWhitelisted] = whitelistUpdate;
          const user = updatedUsersWhitelist.find(
            (user) => user.smartWalletAddress === walletAddress,
          );
          return {
            email: user?.email,
            walletAddress,
            isWhitelisted,
          };
        },
      );
      return {
        success: true,
        whitelistUsersUpdate: usersAndUpdatedWhitelistStatus,
        transactionReceipt: metaTxResult.data.transactionReceipt,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash,
          ),
        },
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async distribute(
    distributeDto: DistributeDto,
    req: RequestWithApiKey & TicketValidate & EventValidate,
  ) {
    try {
      const {
        capsuleTokenVaultKey,
        developerWalletAddress,
        ticketContractAddress,
        ticketId,
        appId,
        eventId,
      } = req;
      const app = await this.database.app.findUnique({ where: { id: appId } });
      const { users } = await this.usersService.createMany(
        {
          users: distributeDto.distributions,
        },
        appId,
      );

      const emailToWalletMap = new Map(
        users.map((account) => [
          account.email,
          {
            smartWalletAddress: account.smartWalletAddress,
            walletAddress: account.walletAddress,
            id: account.id,
          },
        ]),
      );

      const distribution = distributeDto.distributions
        .map((distribution: { email: any; amount: number }) => {
          const mappedUser = emailToWalletMap.get(distribution.email);
          if (mappedUser) {
            return {
              email: distribution.email,
              tokenIds: [],
              userId: mappedUser.id,
              walletAddr: mappedUser.walletAddress,
              smartWalletAddr: mappedUser.smartWalletAddress,
              amount: distribution.amount,
            };
          }
          return null;
        })
        .filter((item) => item !== null);

      const metaTxResult = await biconomyMetaTx({
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: 'tickets',
        functionName: 'distribute',
        args: [distribution.map((dist) => [dist.smartWalletAddr, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress,
      });

      const logs = parseEventLogs({
        abi: contractArtifacts['tickets'].abi,
        logs: metaTxResult.data.transactionReceipt.logs,
      });

      const transferSingleEventArgs = logs
        .filter((log) => (log as any) !== 'TransferSingle')
        .map((log) => (log as any)?.args);

      transferSingleEventArgs.forEach((args) => {
        const matchingRecipient = distribution.find(
          (d) => d.smartWalletAddr.toLowerCase() == args.to.toLowerCase(),
        );
        if (matchingRecipient) {
          matchingRecipient.tokenIds.push(args.id.toString());
        }
      });

      const emailsToSend = await Promise.all(
        distribution.map(async (dist: any) => {
          const ticketUrls = dist.tokenIds.map(
            (tokenId) =>
              `${envVariables.landingPageUrl}/show-ticket?app=${app.slug}&contractId=${ticketId}&tokenId=${tokenId}&userId=${dist.userId}&eventId=${eventId}`,
          );
          return {
            recipientEmail: dist.email,
            subject: `Your ticket${dist.tokenIds.length > 0 ? 's' : ''} to ${app.name}!`,
            template: './ticketReceive',
            context: {
              eventName: app.name,
              ticketUrls,
              imageUrl: app.imageUrl ?? null,
              tokenIds: dist.tokenIds,
            },
          };
        }),
      );
      await this.emailService.sendBatchEmails(
        emailsToSend,
        envVariables.isDevelopment,
      );

      return {
        success: true,
        distribution,
        transactionReceipt: metaTxResult.data.transactionReceipt,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash,
          ),
        },
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async owners(req: RequestWithApiKey & TicketValidate) {
    const { ticketContractAddress } = req;
    const pageSize = 100; // Number of addresses to fetch per call
    let allHolders = [];
    let start = 0;
    try {
      while (true) {
        try {
          const holders: any = await readContract(
            ticketContractAddress,
            contractArtifacts['tickets'].abi,
            'getTicketHolders',
            [start, pageSize],
          );
          allHolders = allHolders.concat(holders);
          start += holders.length;

          if (holders.length < pageSize) {
            break;
          }
        } catch (error) {
          console.error('Error fetching ticket holders:', error);
          break;
        }
      }
      const owners = await this.database.user.findMany({
        where: {
          smartWalletAddress: {
            in: allHolders.map((a: string) => a.toLowerCase()),
          },
        },
        select: {
          email: true,
          smartWalletAddress: true,
        },
      });
      return { owners };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async ownerByEmail(
    email: EmailDto['email'],
    req: RequestWithApiKey & TicketValidate,
  ) {
    const { ticketContractAddress } = req;

    try {
      const user = await this.database.user.findUnique({
        where: {
          email,
        },
        select: {
          email: true,
          walletAddress: true,
          smartWalletAddress: true,
        },
      });

      if (!user) {
        throw new Error('User does not exist');
      }

      const result = await readContract(
        ticketContractAddress,
        contractArtifacts['tickets'].abi,
        'getTokensByUser',
        [user.smartWalletAddress],
      );

      return {
        user: {
          hasTicket: !isEmpty(result),
          ...(!isEmpty(result) && {
            ownedIds: [result].map((id) => id.toString()),
          }),
          email: user.email,
          walletAddress: user.walletAddress,
          smartWalletAddress: user.smartWalletAddress,
        },
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  contracts(appId: string) {
    return this.database.smartContract.findMany({
      where: {
        appId,
        name: 'tickets',
      },
    });
  }

  async showTicket(
    req: RequestWithApiKey & TicketValidate & EventValidate,
    tokenId: string,
    userId?: string,
  ) {
    const { ticketContractAddress, appId, eventId } = req;
    try {
      const eventData = await this.database.event.findUnique({
        where: { id: eventId },
        select: { id: true, name: true },
      });
      const user = await this.database.user?.findUnique({
        where: {
          id: userId,
        },
        select: {
          email: true,
          walletAddress: true,
          smartWalletAddress: true,
          Apps: {
            where: {
              id: appId,
            },
            select: {
              name: true,
            },
          },
        },
      });
      if (!user) {
        throw new Error('User does not exist');
      }
      const result = await readContract(
        ticketContractAddress,
        contractArtifacts['tickets'].abi,
        'balanceOf',
        [user.smartWalletAddress, tokenId],
      );

      return {
        eventName: eventData.name,
        tokenId,
        userWalletAddress: user.walletAddress,
        userEmail: user.email,
        success: true,
        result: Number(result),
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async getTicketDetails(req: RequestWithApiKey & TicketValidate) {
    const { ticketContractAddress, appId, ticketId } = req;

    const app = await this.database.app.findUnique({
      where: {
        id: appId,
      },
    });

    console.log('🔮 app: ', app);

    console.log('🔥 ticketId: ', ticketId);

    const sc = await this.database.smartContract.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        Event: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('🔮 sc: ', sc);

    const readTicketContract = (
      functionName: string,
      args: [] | null = null,
    ) => {
      return readContract(
        ticketContractAddress,
        contractArtifacts['tickets'].abi,
        functionName,
        args,
      );
    };

    const name = await readTicketContract('name');
    const price = await readTicketContract('price');
    const currentSupply = await readTicketContract('currentSupply');
    const totalSupply = await readTicketContract('totalSupply');
    const initialSupply = await readTicketContract('initialSupply');
    const transferable = await readTicketContract('transferable');
    const whitelistOnly = await readTicketContract('whitelistOnly');
    const nextTokenId = await readTicketContract('nextTokenId');

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
      createdAt: new Date(sc.createdAt),
    };
  }

  async getCheckoutSession(
    webhooksDto: WebhooksDto,
    req: RequestWithApiKey & TicketValidate,
  ) {
    console.log(`💽 elo`);
    console.log('🔮 req: ', req.body);
    // console.log("🔮 webhooksDto: ", webhooksDto)
    // console.log("🔮 req: ", req)

    console.log('🔮 webhooksDto: ', webhooksDto);
    console.log(
      '🔮 process.env.STRIPE_SECRET_KEY: ',
      process.env.STRIPE_SECRET_KEY,
    );
    try {
      const user = await this.database.user.findUnique({
        where: { id: webhooksDto.userId },
        select: {
          id: true,
          smartWalletAddress: true,
        },
      });

      const ticket = await this.database.smartContract.findUnique({
        where: {
          id: webhooksDto.ticketId,
        },
        include: {
          Event: {
            select: {
              name: true,
            },
          },
        },
      });

      const price = await readContract(
        ticket.address,
        contractArtifacts['tickets'].abi,
        'price',
      );

      console.log('🔮 price: ', Number(price));

      const erc20Decimals = await readContract(
        envVariables.erc20Address,
        contractArtifacts['erc20'].abi,
        'decimals',
      );

      const denomPrice = Number(price) / 10 ** Number(erc20Decimals);

      console.log('🔮 denomPrice: ', denomPrice);

      console.log('🔮 ticket: ', ticket);

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: '2024-10-28.acacia',
      });

      console.log(`💽 hello`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${ticket.Event.name} ticket`,
                // description: "This cost X USDC, we will convert it for you",
                images: ['https://avatars.githubusercontent.com/u/164048341'],
                metadata: {
                  key1: 'value1',
                  key2: 'value2',
                },
              },
              unit_amount: denomPrice, // Stripe expects amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `https://example.com`,
        cancel_url: `https://example.com/cancel`,
        payment_intent_data: {
          metadata: {
            userSmartWalletAddress: user.smartWalletAddress,
            userId: user.id,
            ticketId: ticket.id,
          },
        },
      });

      console.log('💳 session: ', session);

      return session;

      // return NextResponse.json({ sessionId: session.id });
    } catch (err: any) {
      console.log('🚨 error on /checkout-session', err.message);
      // return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
