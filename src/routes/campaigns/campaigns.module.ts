import { EmailModule } from '@/common/services/email/email.module';
import { TicketsModule } from "@/routes/tickets/tickets.module";
import { Module } from "@nestjs/common";
import { CampaignsController, CampaignsPrivateController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";

@Module({
  imports: [TicketsModule, EmailModule],
  controllers: [CampaignsController, CampaignsPrivateController],
  providers: [CampaignsService],
  exports: [CampaignsService]
})
export class CampaignsModule {}
