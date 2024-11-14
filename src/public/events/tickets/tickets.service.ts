import { HttpException, Injectable } from "@nestjs/common";
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

@Injectable()
export class TicketsService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService,
    private ticketSnapshotService: TicketsSnapshotService,
    private ticketDistributeService: TicketsDistributeService,
    private ticketDistributeCampaignService: TicketsDistributeCampaignService
  ) {}

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
    return this.ticketDistributeCampaignService.distribute(campaignId, appId, req);
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
    try {
      const {
        developerId,
        appId,
        capsuleTokenVaultKey,
        developerWalletAddress,
        eventId
      } = params;
      const { metadataUrl, metadataImageUrl } = await uploadMetadata({
        name: createTicketDto.name,
        symbol: createTicketDto.symbol,
        description: createTicketDto.description,
        image: ""
      });

      const smartWallet =
        await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();

      const contractName = "tickets";

      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet,
        baseURI: metadataUrl,
        name: createTicketDto.name,
        symbol: createTicketDto.symbol,
        initialSupply: createTicketDto.initialSupply,
        maxSupply: createTicketDto.maxSupply,
        transferable: createTicketDto.transferable,
        whitelistOnly: createTicketDto.whitelistOnly
      };

      const contract = await deployContract(contractName, Object.values(args));
      console.log(
        "⛓️ Contract Explorer URL: ",
        getExplorerUrl(contract.contractAddr)
      );
      const slug = slugify(createTicketDto.name, {
        lower: true,
        strict: true,
        trim: true
      });
      const ticket = await this.database.ticket.create({
        data: {
          address: contract.contractAddr,
          name: createTicketDto.name,
          metadataUrl,
          slug,
          metadataPayload: {
            name: createTicketDto.name,
            symbol: createTicketDto.symbol,
            description: createTicketDto.description,
            ...(metadataImageUrl && { metadataImageUrl })
          },
          App: { connect: { id: appId } },
          Event: { connect: { id: eventId } },
          DevelopersAccount: { connect: { id: developerId } }
        }
      });
      return {
        success: true,
        ticketId: ticket.id,
        ticket,
        contract,
        explorerUrls: {
          contract: getExplorerUrl(contract.contractAddr)
        }
      };
    } catch (e) {
      throw new HttpException(e?.message, 500);
    }
  }
  async supply(supplyDto: SupplyDto, req: RequestWithApiKey & TicketValidate) {
    const {
      ticketContractAddress,
      capsuleTokenVaultKey,
      developerWalletAddress
    } = req;
    try {
      const metaTxResult = await biconomyMetaTx({
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: "tickets",
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
      const {
        capsuleTokenVaultKey,
        ticketContractAddress,
        developerWalletAddress,
        appId
      } = req;
      const allEmails = [
        ...whitelistDto.addEmails,
        ...whitelistDto.removeEmails
      ];
      const { users } = await this.usersService.createMany(
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
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: "tickets",
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
    const pageSize = pagination.pageSize || 100;
    let allHolders = [];
    let start = pagination.start || 0;
    try {
      while (true) {
        try {
          const holders: any = await readContract(
            ticketContractAddress,
            contractArtifacts["tickets"].abi,
            "getTicketHolders",
            [start, pageSize]
          );
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
      const lowercaseHolders = allHolders.map((a: string) => a.toLowerCase());

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

      const result = await readContract(
        ticketContractAddress,
        contractArtifacts["tickets"].abi,
        "getTokensByUser",
        [user.smartWalletAddress]
      );

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
  contracts(appId: string) {
    return this.database.ticket.findMany({
      where: {
        appId
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
      const result = await readContract(
        ticketContractAddress,
        contractArtifacts["tickets"].abi,
        "balanceOf",
        [user.smartWalletAddress, tokenId]
      );

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
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: "tickets",
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
      throw new HttpException(e.message, 500);
    }
  }
}
