import { DatabaseService } from "@/common/services/database/database.service";
import { getEthPrice } from "@/utils/getEthPrice";
import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Interaction } from "@prisma/client";
import { ethers } from "ethers";

@Injectable()
export class InteractionEvent {
  constructor(private database: DatabaseService) {}

  @OnEvent("interaction.create")
  async handleInteraction(data: Interaction) {
    const { value } = await getEthPrice();
    const gasUsdPrice = (Number(ethers.utils.formatEther(data?.gasWeiPrice)) * Number(value)).toString();

    await this.database.interaction.create({
      data: {
        ...data,
        gasUsdPrice
      }
    });
  }

  @OnEvent("interaction.create.income")
  async handleInteractionIncomeTicketStripe(data: Interaction) {
    await this.database.interaction.create({
      data
    });
  }
}