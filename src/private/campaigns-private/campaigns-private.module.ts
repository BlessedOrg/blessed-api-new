import { Module } from '@nestjs/common';
import { CampaignsPrivateController } from './campaigns-private.controller';
import { TicketsModule } from '@/public/events/tickets/tickets.module';
import { CampaignsService } from '@/public/campaigns/campaigns.service';

@Module({
  imports: [TicketsModule],
  controllers: [CampaignsPrivateController],
  providers: [CampaignsService],
})
export class CampaignsPrivateModule {}
