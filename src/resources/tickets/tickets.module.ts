import { Module } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController, TicketsPrivateController } from "./tickets.controller";
import { UsersModule } from "@/resources/users/users.module";
import { EmailModule } from "@/common/services/email/email.module";
import { TicketIdInterceptor } from "@/common/interceptors/param-protect/ticket-id-interceptor";
import { TicketsSnapshotService } from "@/resources/tickets/services/tickets-snapshot.service";
import { TicketsDistributeService } from "@/resources/tickets/services/tickets-distribute.service";
import { TicketsDistributeCampaignService } from "@/resources/tickets/services/tickets-distribute-campaign.service";
import { EventsService } from "@/resources/events/events.service";
import { SessionModule } from "@/common/services/session/session.module";

@Module({
  imports: [UsersModule, EmailModule, SessionModule],
  controllers: [TicketsController, TicketsPrivateController],
  providers: [
    TicketsService,
    TicketsSnapshotService,
    TicketsDistributeService,
    EventsService,
    TicketsDistributeCampaignService,
    TicketIdInterceptor,
    EventsService
  ],
  exports: [TicketsService]
})
export class TicketsModule {}
