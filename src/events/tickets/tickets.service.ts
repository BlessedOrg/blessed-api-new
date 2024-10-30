import { HttpException, Injectable } from "@nestjs/common";
import { CreateTicketDto } from "@/events/tickets/dto/create-ticket.dto";
import { DatabaseService } from "@/common/services/database/database.service";
import { uploadMetadata } from "@/lib/irys";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { SupplyDto } from "@/events/tickets/dto/supply.dto";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { WhitelistDto } from "@/events/tickets/dto/whitelist.dto";
import { UsersService } from "@/users/users.service";
import { EmailService } from "@/common/services/email/email.service";
import { isEmpty } from "lodash";
import { EmailDto } from "@/common/dto/email.dto";
import { parseEventLogs } from "viem";
import { envConstants } from "@/common/constants";
import { DistributeDto } from "@/events/tickets/dto/distribute.dto";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";

@Injectable()
export class TicketsService {
  constructor(private database: DatabaseService, private usersService: UsersService, private emailService: EmailService) {}
  async create(createTicketDto: CreateTicketDto, req: RequestWithApiKey & EventValidate) {
    try {
      const { developerId, appId, capsuleTokenVaultKey, developerWalletAddress } = req;
      const { metadataUrl, metadataImageUrl } = await uploadMetadata({
        name: createTicketDto.name,
        symbol: createTicketDto.symbol,
        description: createTicketDto.description,
        image: ""
      });

      const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
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
      console.log("⛓️ Contract Explorer URL: ", getExplorerUrl(contract.contractAddr));

      const maxId = await this.database.smartContract.aggregate({
        where: {
          appId,
          developerId,
          name: contractName
        },
        _max: {
          version: true
        }
      });

      const nextId = (maxId._max.version || 0) + 1;
      const ticketRecord = await this.database.smartContract.create({
        data: {
          address: contract.contractAddr,
          name: contractName,
          version: nextId,
          metadataUrl,
          metadataPayload: {
            name: createTicketDto.name,
            symbol: createTicketDto.symbol,
            description: createTicketDto.description,
            ...metadataImageUrl && { metadataImageUrl }
          },
          App: { connect: { id: appId } },
          Event: { connect: { id: req.eventId } },
          DevelopersAccount: { connect: { id: req.developerId } }
        }
      });
      return {
        success: true,
        ticketId: ticketRecord.id,
        contract,
        ticketRecord,
        explorerUrls: {
          contract: getExplorerUrl(contract.contractAddr)
        }
      };
    } catch (e) {
      throw new HttpException(e?.message, 500);
    }
  }
  async supply(supplyDto: SupplyDto, req: RequestWithApiKey & TicketValidate) {
    const { ticketContractAddress, capsuleTokenVaultKey, developerWalletAddress } = req;
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
          tx: getExplorerUrl(metaTxResult.data.transactionReceipt.transactionHash)
        },
        transactionReceipt: metaTxResult.data.transactionReceipt
      };
    } catch (e) {
      throw new HttpException(e?.message, 500);
    }
  }
  async whitelist(whitelistDto: WhitelistDto, req: RequestWithApiKey & TicketValidate) {
    try {
      const { capsuleTokenVaultKey, ticketContractAddress, developerWalletAddress, appId } = req;
      const allEmails = [...whitelistDto.addEmails, ...whitelistDto.removeEmails];
      const { users } = await this.usersService.createMany({ users: allEmails }, appId);

      const emailToWalletMap = new Map(users.map(account => [account.email, account.smartWalletAddress]));

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

      return {
        success: true,
        explorerUrls: {
          tx: getExplorerUrl(metaTxResult.data.transactionReceipt.transactionHash)
        },
        whitelistUpdatesMap: whitelistUpdates,
        transactionReceipt: metaTxResult.data.transactionReceipt
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async distribute(distributeDto: DistributeDto, req: RequestWithApiKey & TicketValidate) {
    try {
      const { capsuleTokenVaultKey, developerWalletAddress, ticketContractAddress, ticketId, appId } = req;
      const app = await this.database.app.findUnique({ where: { id: appId } });
      const { users } = await this.usersService.createMany({
        users: distributeDto.distributions
      }, appId);

      const emailToWalletMap = new Map(users.map(account => [account.email, {
        smartWalletAddress: account.smartWalletAddress,
        walletAddress: account.walletAddress,
        id: account.id
      }]));

      const distribution = distributeDto.distributions.map((distribution: { email: any, amount: number }) => {
        const mappedUser = emailToWalletMap.get(distribution.email);
        if (mappedUser) {
          return {
            email: distribution.email,
            tokenIds: [],
            userId: mappedUser.id,
            walletAddr: mappedUser.walletAddress,
            smartWalletAddr: mappedUser.smartWalletAddress,
            amount: distribution.amount
          };
        }
        return null;
      }).filter((item) => item !== null);

      const metaTxResult = await biconomyMetaTx({
        contractAddress: ticketContractAddress as PrefixedHexString,
        contractName: "tickets",
        functionName: "distribute",
        args: [distribution.map(dist => [dist.smartWalletAddr, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      const logs = parseEventLogs({
        abi: contractArtifacts["tickets"].abi,
        logs: metaTxResult.data.transactionReceipt.logs
      });

      const transferSingleEventArgs = logs
        .filter(log => (log as any) !== "TransferSingle")
        .map((log) => (log as any)?.args);

      transferSingleEventArgs.forEach((args) => {
        const matchingRecipient = distribution
          .find(d => d.smartWalletAddr.toLowerCase() == args.to.toLowerCase());
        if (matchingRecipient) {
          matchingRecipient.tokenIds.push(args.id.toString());
        }
      });

      const emailsToSend = await Promise.all(
        distribution.map(async (dist: any) => {
          const ticketUrls = dist.tokenIds.map((tokenId) =>
            `${envConstants.landingPageUrl}/show-ticket?app=${app.slug}&contractId=${ticketId}&tokenId=${tokenId}&userId=${dist.userId}`
          );
          return {
            recipientEmail: dist.email,
            subject: `Your ticket${dist.tokenIds.length > 0 ? "s" : ""} to ${app.name}!`,
            template: "./ticketReceive",
            context: {
              eventName: app.name,
              ticketUrls,
              imageUrl: app.imageUrl ?? null,
              tokenIds: dist.tokenIds
            }
          };
        })
      );
      await this.emailService.sendBatchEmails(emailsToSend, envConstants.isDevelopment);

      return {
        success: true,
        distribution,
        explorerUrls: {
          tx: getExplorerUrl(metaTxResult.data.transactionReceipt.transactionHash)
        },
        transactionReceipt: metaTxResult.data.transactionReceipt
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
      const owners = await this.database.user.findMany({
        where: {
          smartWalletAddress: {
            in: allHolders.map((a: string) => a.toLowerCase())
          }
        },
        select: {
          email: true,
          smartWalletAddress: true
        }
      });
      return { owners };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async ownerByEmail(email: EmailDto["email"], req: RequestWithApiKey & TicketValidate) {
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

      return (
        {
          user: {
            hasTicket: !isEmpty(result),
            ...!isEmpty(result) && {
              ownedIds: [result].map(id => id.toString())
            },
            email: user.email,
            walletAddress: user.walletAddress,
            smartWalletAddress: user.smartWalletAddress
          }
        }
      );
    } catch (e) {
      throw new HttpException(e.message, 500);
    }

  }
  contracts(appId: string) {
    return this.database.smartContract.findMany({
      where: {
        appId,
        name: "tickets"
      }
    });
  }
  async showTicket(req: RequestWithApiKey & TicketValidate, tokenId: string, userId?: string) {
    const { ticketContractAddress, appId } = req;
    try {
      const user = await this.database.user?.findUnique({
        where: {
          id: userId
        },
        select: {
          email: true,
          walletAddress: true,
          smartWalletAddress: true,
          Apps: {
            where: {
              id: appId
            },
            select: {
              name: true
            }
          }
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

      return (
        {
          eventName: user?.Apps?.[0]?.name,
          tokenId,
          userWalletAddress: user.walletAddress,
          userEmail: user.email,
          success: true,
          result: Number(result)
        }
      );
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
}
