import { DatabaseService } from "@/common/services/database/database.service";
import { biconomyMetaTx } from "@/lib/biconomy";
import { getEthPrice } from "@/utils/getEthPrice";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrefixedHexString } from "ethereumjs-util";
import { ethers } from "ethers";

@Injectable()
export class TicketCreateEvent {
  constructor(private database: DatabaseService) {}

  @OnEvent("ticket.create")
  async handleTicketCreateEvent({
    eventAddress,
    ticketAddress,
    capsuleTokenVaultKey,
    developerId,
    eventId
  }) {
    const { value } = await getEthPrice();
    const resposne = await biconomyMetaTx({
      contractName: "event",
      address: eventAddress as PrefixedHexString,
      functionName: "addTicket",
      args: [ticketAddress],
      capsuleTokenVaultKey
    });

    const gasUsdPrice = (Number(ethers.utils.formatEther(resposne.data.actualGasCost)) * Number(value)).toString();
    await this.database.interaction.create({
      data: {
        gasWeiPrice: resposne.data.actualGasCost,
        gasUsdPrice,
        txHash: resposne.data.transactionReceipt.transactionHash,
        method: `addTicket-event`,
        operatorType: "biconomy",
        developerId,
        eventId
      }
    });
  }
}