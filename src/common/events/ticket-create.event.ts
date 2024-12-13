import { DatabaseService } from "@/common/services/database/database.service";
import { OnEvent } from "@nestjs/event-emitter";
import { Injectable } from "@nestjs/common";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";

@Injectable()
export class TicketCreateEvent {
  constructor(private database: DatabaseService) {}

  @OnEvent("ticket.created")
  async handleTicketCreateEvent({
    eventAddress,
    ticketAddress,
    capsuleTokenVaultKey,
    developerId,
    eventId
  }) {
    const resposne = await biconomyMetaTx({
      contractName: "event",
      address: eventAddress as PrefixedHexString,
      functionName: "addTicket",
      args: [ticketAddress],
      capsuleTokenVaultKey
    });

    await this.database.interaction.create({
      data: {
        gasWeiPrice: resposne.data.actualGasCost,
        txHash: resposne.data.transactionReceipt.transactionHash,
        method: `addTicket-Event`,
        operatorType: "biconomy",
        developerId,
        eventId
      }
    });
  }
}