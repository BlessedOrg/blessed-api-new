import { HttpException, Injectable } from "@nestjs/common";
import { contractArtifacts, getExplorerUrl } from "@/lib/viem";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { parseEventLogs } from "viem";
import { DistributeDto } from "@/resources/tickets/dto/distribute.dto";
import { DatabaseService } from "@/common/services/database/database.service";
import { UsersService } from "@/resources/users/users.service";
import { EmailService } from "@/common/services/email/email.service";
import { envVariables } from "@/common/env-variables";
import { SessionService } from "@/common/services/session/session.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class TicketsDistributeService {
  constructor(
    private eventEmitter: EventEmitter2,
    private database: DatabaseService,
    private usersService: UsersService,
    private emailService: EmailService,
    private sessionService: SessionService
  ) {}
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
      const { users } = await this.usersService.createManyUserAccounts(
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
          let accessToken;
          const isSessionValid = await this.sessionService.checkIsSessionValid(dist.userId, "user", false);

          if (isSessionValid) {
            const session = await this.database.userSession.findFirst({ where: { User: { email: dist.email } }, orderBy: { createdAt: "desc" } });
            accessToken = session?.accessToken;
          } else {
            accessToken = (await this.sessionService.createOrUpdateSession(dist.email, "user", appId)).accessToken;
          }

          return {
            recipientEmail: dist.email,
            subject: `Your ticket${dist.tokenIds.length > 0 ? "s" : ""} to ${eventData.name}!`,
            template: "./ticketReceive",
            context: {
              eventName: eventData.name,
              ticketsUrl: `${envVariables.ticketerAppUrl}&session=${accessToken}`,
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
      const developer = await this.database.developer.findUnique({ where: { walletAddress: developerWalletAddress }, select: { id: true } });
      const ticket = await this.database.ticket.findUnique({ where: { address: ticketContractAddress }, select: { id: true, Event: { select: { id: true } } } });
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
        contractName: "tickets",
        address: ticketContractAddress as PrefixedHexString,
        functionName: "distribute",
        args: [distribution.map((dist) => [dist.smartWalletAddress, dist.amount])],
        capsuleTokenVaultKey,
        userWalletAddress: developerWalletAddress
      });

      this.eventEmitter.emit("interaction.create", {
        method: `distribute-ticket`,
        gasWeiPrice: metaTxResult.data.actualGasCost,
        txHash: metaTxResult.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        developerId: developer.id,
        ticketId: ticket.id,
        eventId: ticket.Event.id
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