import { Module } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller";
import { TicketsModule } from "@/public/events/tickets/tickets.module";
import { CampaignsService } from "@/public/campaigns/campaigns.service";

@Module({
  imports: [TicketsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService]
})
export class CampaignsModule {}
