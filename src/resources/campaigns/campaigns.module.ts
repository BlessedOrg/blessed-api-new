import { Module } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController, CampaignsPrivateController } from "./campaigns.controller";
import { TicketsModule } from "@/resources/tickets/tickets.module";

@Module({
  imports: [TicketsModule],
  controllers: [CampaignsController, CampaignsPrivateController],
  providers: [CampaignsService],
  exports: [CampaignsService]
})
export class CampaignsModule {}
