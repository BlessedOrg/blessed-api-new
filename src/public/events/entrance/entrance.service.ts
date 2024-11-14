import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEntranceDto } from "@/public/events/entrance/dto/create-entrance.dto";
import { uploadMetadata } from "@/lib/irys";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { EntryDto } from "@/public/events/entrance/dto/entry.dto";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import slugify from "slugify";

@Injectable()
export class EntranceService {
  constructor(private database: DatabaseService) {}

  all(appId: string) {
    return this.database.entrance.findMany({
      where: {
        appId
      }
    });
  }
  async create(
    createEntranceDto: CreateEntranceDto,
    req: RequestWithApiKey & EventValidate
  ) {
    const { appId, developerWalletAddress, capsuleTokenVaultKey, eventId } =
      req;
    const event = await this.database.event.findUnique({
      where: { id: eventId }
    });
    try {
      const metadataPayload = {
        name: `${event.name} - entrance checker`,
        symbol: "",
        description: `Entrance checker for ${event.name} event`,
        image: ""
      };
      const { metadataUrl, metadataImageUrl } =
        await uploadMetadata(metadataPayload);
      const contractName = "entrance";

      const smartWallet =
        await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();

      const ticket = await this.database.ticket.findUnique({
        where: { address: createEntranceDto.ticketAddress }
      });
      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet,
        ticketAddress: createEntranceDto.ticketAddress
      };

      const contract = await deployContract(contractName, Object.values(args));
      console.log(
        "⛓️ Contract Explorer URL: ",
        getExplorerUrl(contract.contractAddr)
      );
      const slug = slugify(createEntranceDto.name, {
        lower: true,
        strict: true,
        trim: true
      });
      const entrance = await this.database.entrance.create({
        data: {
          address: contract.contractAddr,
          name: createEntranceDto.name,
          metadataUrl,
          slug,
          metadataPayload: {
            ...metadataPayload,
            ...(metadataImageUrl && { metadataImageUrl })
          },
          App: { connect: { id: appId } },
          Event: { connect: { id: req.eventId } },
          DevelopersAccount: { connect: { id: req.developerId } },
          Ticket: { connect: { id: ticket.id } }
        }
      });

      return {
        success: true,
        entrance,
        contract,
        explorerUrls: {
          contract: getExplorerUrl(contract.contractAddr)
        }
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async entry(
    entryDto: EntryDto,
    entranceId: string,
    req: RequestWithApiKeyAndUserAccessToken
  ) {
    try {
      const { walletAddress, capsuleTokenVaultKey } = req;
      const { ticketId } = entryDto;
      const entranceRecord = await this.database.entrance.findUnique({
        where: { id: entranceId }
      });
      if (!entranceRecord.address) {
        throw new Error(
          `Wrong parameters. Smart contract entrance from app ${req.appSlug} not found.`
        );
      }
      const contractAddress = entranceRecord.address as PrefixedHexString;
      const smartWallet = await getSmartWalletForCapsuleWallet(
        req.capsuleTokenVaultKey
      );
      const ownerSmartWallet = await smartWallet.getAccountAddress();
      const isAlreadyEntered = await readContract(
        contractAddress,
        contractArtifacts["entrance"].abi,
        "hasEntry",
        [ownerSmartWallet]
      );

      if (!isAlreadyEntered) {
        const metaTxResult = await biconomyMetaTx({
          contractAddress: contractAddress,
          contractName: "entrance",
          functionName: "entry",
          args: [ticketId],
          userWalletAddress: walletAddress as PrefixedHexString,
          capsuleTokenVaultKey
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
      } else {
        return { message: "Already entered" };
      }
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async entries(entranceId: string) {
    try {
      const entranceRecord = await this.database.entrance.findUnique({
        where: {
          id: entranceId
        }
      });
      const entries = (await readContract(
        entranceRecord.address,
        contractArtifacts["entrance"].abi,
        "getEntries",
        []
      )) as any;
      const formattedEntries = [];
      const notFoundAddresses = [];

      for (const entry of entries) {
        const user = await this.database.user.findUnique({
          where: {
            smartWalletAddress: entry.wallet?.toLowerCase()
          },
          select: {
            email: true,
            walletAddress: true,
            id: true
          }
        });

        if (user) {
          formattedEntries.push({
            email: user.email,
            smartWalletAddress: entry.wallet.toLowerCase(),
            walletAddress: user.walletAddress,
            entryTimestamp: Number(entry.timestamp),
            ticketId: Number(entry.ticketId),
            id: user.id
          });
        } else {
          notFoundAddresses.push(entry.wallet.toLowerCase());
          formattedEntries.push({
            external: true,
            walletAddress: entry.wallet.toLowerCase(),
            entryTimestamp: Number(entry.timestamp),
            ticketId: Number(entry.ticketId)
          });
        }
      }

      return {
        entries: formattedEntries,
        externalAddresses: notFoundAddresses
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
}
