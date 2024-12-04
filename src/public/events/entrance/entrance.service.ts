import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { uploadMetadata } from "@/lib/irys";
import { getSmartWalletForCapsuleWallet } from "@/lib/capsule";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";

@Injectable()
export class EntranceService {
  constructor(private database: DatabaseService) {}

  all(eventId: string) {
    return this.database.entrance.findMany({
      where: {
        eventId
      }
    });
  }

  async create(
    ticketId: string,
    req: {
      developerWalletAddress: string;
      capsuleTokenVaultKey: string;
      eventId: string;
      appId: string;
    }
  ) {
    const { developerWalletAddress, capsuleTokenVaultKey, eventId, appId } =
      req;
    const ticket = await this.database.ticket.findUnique({ where: { id: ticketId, appId }, include: { Entrance: true } });
    if (ticket?.Entrance) {
      throw new HttpException("Entrance already exists for this ticket", 400);
    }
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
      const { metadataUrl, metadataImageUrl } = await uploadMetadata(metadataPayload);
      const contractName = "entrance";

      const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();

      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet,
        ticketAddress: ticket.address
      };

      const contract = await deployContract(contractName, Object.values(args));

      const entrance = await this.database.entrance.create({
        data: {
          address: contract.contractAddr,
          metadataUrl,
          metadataPayload: {
            ...metadataPayload,
            ...(metadataImageUrl && { metadataImageUrl })
          },
          Event: { connect: { id: req.eventId } },
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

  async entry(decodedCodeData: ITicketQrCodePayload) {
    try {
      const { eventId, ticketId, tokenId, ticketHolderId } = decodedCodeData;
      const entranceRecord = await this.database.entrance.findUnique({
        where: { eventId, ticketId }
      });
      if (!entranceRecord.address) {
        throw new HttpException(`Wrong parameters. Smart contract entrance not found.`, HttpStatus.BAD_REQUEST);
      }
      const ticketHolder = await this.database.user.findUnique({ where: { id: ticketHolderId } });
      const { capsuleTokenVaultKey } = ticketHolder;
      const contractAddress = entranceRecord.address as PrefixedHexString;
      const smartWallet = await getSmartWalletForCapsuleWallet(capsuleTokenVaultKey);
      const ownerSmartWallet = await smartWallet.getAccountAddress();
      const isAlreadyEntered = await readContract({
        abi: contractArtifacts["entrance"].abi,
        address: contractAddress,
        functionName: "hasEntry",
        args: [ownerSmartWallet]
      });

      if (isAlreadyEntered) {
        throw new HttpException("Already entered", HttpStatus.CONFLICT);
      }

      const metaTxResult = await biconomyMetaTx({
        abi: contractArtifacts["entrance"].abi,
        address: contractAddress,
        functionName: "entry",
        args: [tokenId],
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
    } catch (e) {
      throw new HttpException(e.message, e.status ?? HttpStatus.BAD_REQUEST);
    }
  }

  async entries(ticketId: string) {
    try {
      const ticketEntranceRecord = await this.database.ticket.findUnique({
        where: {
          id: ticketId
        },
        include: {
          Entrance: true
        }
      });
      const entries = await readContract({
        abi: contractArtifacts["entrance"].abi,
        address: ticketEntranceRecord.Entrance.address,
        functionName: "getEntries"
      });
      const formattedEntries = [];
      const notFoundAddresses = [];

      for (const entry of entries as any) {
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
