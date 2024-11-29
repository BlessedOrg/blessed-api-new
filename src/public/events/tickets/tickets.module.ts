import { Module } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController } from "./tickets.controller";
import { UsersModule } from "@/public/users/users.module";
import { EmailModule } from "@/common/services/email/email.module";
import { TicketIdInterceptor } from "@/common/interceptors/param-protect/ticket-id-interceptor";
import { EntranceService } from "@/public/events/entrance/entrance.service";
import { TicketsSnapshotService } from "@/public/events/tickets/services/tickets-snapshot.service";
import { TicketsDistributeService } from "@/public/events/tickets/services/tickets-distribute.service";
import { TicketsDistributeCampaignService } from "@/public/events/tickets/services/tickets-distribute-campaign.service";
import { EventsService } from "@/public/events/events.service";

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsSnapshotService,
    TicketsDistributeService,
    EventsService,
    TicketsDistributeCampaignService,
    TicketIdInterceptor,
    EntranceService
  ],
  exports: [TicketsService]
})
export class TicketsModule {}
