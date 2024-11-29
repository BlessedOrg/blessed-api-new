import { HttpException, Injectable } from "@nestjs/common";
import { contractArtifacts, getExplorerUrl } from "@/lib/viem";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { parseEventLogs } from "viem";
import { DistributeDto } from "@/public/events/tickets/dto/distribute.dto";
import { DatabaseService } from "@/common/services/database/database.service";
import { UsersService } from "@/public/users/users.service";
import { EmailService } from "@/common/services/email/email.service";
import { envVariables } from "@/common/env-variables";

@Injectable()
export class TicketsDistributeService {
  constructor(private database: DatabaseService, private usersService: UsersService, private emailService: EmailService) {}
  async distribute(
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
    try {
      const { capsuleTokenVaultKey, developerWalletAddress, ticketContractAddress, ticketId, appId, eventId } = params;
      const app = await this.database.app.findUnique({ where: { id: appId } });
      const { users } = await this.usersService.createMany(
        { users: distributeDto.distributions },
        appId
      );
      const eventData = await this.database.event.findUnique({ where: { id: eventId } });
      const ticketData = await this.database.ticket.findUnique({ where: { id: ticketId } }) as any;
      const usersWithAmount = users.map((user) => ({
        ...user,
        userId: user.id,
        amount: distributeDto.distributions.find((d) => d.email === user.email)?.amount
      }));
      const { distribution, explorerUrls } =
        await this.distributeTickets(
          usersWithAmount,
          ticketContractAddress,
          developerWalletAddress,
          capsuleTokenVaultKey
        );

      const emailsToSend = await Promise.all(
        distribution.map(async (dist) => {
          return {
            recipientEmail: dist.email,
            subject: `Your ticket${dist.tokenIds.length > 0 ? "s" : ""} to ${app.name}!`,
            template: "./ticketReceive",
            context: {
              eventName: eventData.name,
              ticketsUrl: envVariables.ticketerAppUrl,
              imageUrl: ticketData.metadataPayload?.metadataImageUrl ?? null,
              tokenIds: dist.tokenIds
            }
          };
        })
      );
      await this.emailService.sendBatchEmails(
        emailsToSend,
        envVariables.isDevelopment
      );

      return {
        success: true,
        distribution,
        explorerUrls
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }
  async distributeTickets(
    users: {
      email: string;
      smartWalletAddress: string;
      walletAddress: string;
      amount: number;
      userId: string;
    }[],
    ticketContractAddress: string,
    developerWalletAddress: string,
    capsuleTokenVaultKey: string
  ) {
    try {
      const emailToWalletMap = new Map(
        users.map((account) => [
          account.email,
          {
            smartWalletAddress: account.smartWalletAddress,
            walletAddress: account.walletAddress
          }
        ])
      );

      const distribution = users
        .map((distribution) => {
          const mappedUser = emailToWalletMap.get(distribution.email);
          if (mappedUser) {
            return {
              email: distribution.email,
              tokenIds: [],
              walletAddress: mappedUser.walletAddress,
              smartWalletAddress: mappedUser.smartWalletAddress,
              amount: distribution.amount,
              userId: distribution.userId
            };
          }
          return null;
        })
        .filter((item) => item !== null);

      const metaTxResult = await biconomyMetaTx({
        abi: contractArtifacts["tickets"].abi,
        address: ticketContractAddress as PrefixedHexString,
        functionName: "distribute",
        args: [distribution.map((dist) => [dist.smartWalletAddress, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      const logs = parseEventLogs({
        abi: contractArtifacts["tickets"].abi,
        logs: metaTxResult.data.transactionReceipt.logs
      });

      const transferSingleEventArgs = logs
        .filter((log) => (log as any) !== "TransferSingle")
        .map((log) => (log as any)?.args);

      transferSingleEventArgs.forEach((args) => {
        const matchingRecipient = distribution.find(
          (d) => d.smartWalletAddress.toLowerCase() == args.to.toLowerCase()
        );
        if (matchingRecipient) {
          matchingRecipient.tokenIds.push(args.id.toString());
        }
      });

      return {
        distribution,
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
}
