import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEntranceDto } from "@/events/entrance/dto/create-entrance.dto";
import { uploadMetadata } from "@/lib/irys";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { EntryDto } from "@/events/entrance/dto/entry.dto";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";

@Injectable()
export class EntranceService {
  constructor(private database: DatabaseService) {}

  all(appId: string) {
    return this.database.smartContract.findMany({
      where: {
        appId,
        name: "entrance"
      }
    });
  }
  async create(createEntranceDto: CreateEntranceDto, req: RequestWithApiKey & EventValidate) {
    const { appId, developerWalletAddress, capsuleTokenVaultKey } = req;
    try {
      const metadataPayload = {
        name: "Entrance checker",
        symbol: "",
        description: "Entrance checker for event",
        image: ""
      };
      const { metadataUrl, metadataImageUrl } = await uploadMetadata(metadataPayload);
      const contractName = "entrance";

      const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();

      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet,
        ticketAddress: createEntranceDto.ticketAddress
      };

      const contract = await deployContract(contractName, Object.values(args));
      console.log("⛓️ Contract Explorer URL: ", getExplorerUrl(contract.contractAddr));

      const maxId = await this.database.smartContract.aggregate({
        where: {
          appId,
          developerId: req.developerId,
          name: contractName
        },
        _max: {
          version: true
        }
      });

      const nextId = (maxId._max.version || 0) + 1;

      const entrance = await this.database.smartContract.create({
        data: {
          address: contract.contractAddr,
          name: contractName,
          version: nextId,
          metadataUrl,
          metadataPayload: {
            ...metadataPayload,
            ...metadataImageUrl && { metadataImageUrl }
          },
          App: { connect: { id: appId } },
          Event: { connect: { id: req.eventId } },
          DevelopersAccount: { connect: { id: req.developerId } }
        }
      });

      return (
        {
          success: true,
          entrance,
          contract,
          explorerUrls: {
            contract: getExplorerUrl(contract.contractAddr)
          }
        }
      );
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async entry(entryDto: EntryDto, entranceId: string, req: RequestWithApiKeyAndUserAccessToken) {
    try {
      const { walletAddress, capsuleTokenVaultKey } = req;
      const { ticketId } = entryDto;
      const entranceRecord = await this.database.smartContract.findUnique({ where: { id: entranceId } });
      if (!entranceRecord.address) {
        throw new Error(`Wrong parameters. Smart contract entrance from app ${req.appSlug} not found.`);
      }
      const contractAddress = entranceRecord.address as PrefixedHexString;
      const smartWallet = await getSmartWalletForCapsuleWallet(req.capsuleTokenVaultKey);
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

        return (
          {
            success: true,
            explorerUrls: {
              tx: getExplorerUrl(metaTxResult.data.transactionReceipt.transactionHash)
            },
            transactionReceipt: metaTxResult.data.transactionReceipt
          }
        );
      } else {
        return { message: "Already entered" };
      }
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
}
