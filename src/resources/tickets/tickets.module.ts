import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "@/common/services/session/session.module";
import { EventsService } from "@/resources/events/events.service";
import { TicketsDistributeCampaignService } from "@/resources/tickets/services/tickets-distribute-campaign.service";
import { TicketsDistributeService } from "@/resources/tickets/services/tickets-distribute.service";
import { TicketsSnapshotService } from "@/resources/tickets/services/tickets-snapshot.service";
import { UsersModule } from "@/resources/users/users.module";
import { Module } from "@nestjs/common";
import { StakeholdersModule } from '../stakeholders/stakeholders.module';
import { TicketsController, TicketsPrivateController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [UsersModule, EmailModule, SessionModule, StakeholdersModule],
  controllers: [TicketsController, TicketsPrivateController],
  providers: [
    TicketsService,
    TicketsSnapshotService,
    TicketsDistributeService,
    EventsService,
    TicketsDistributeCampaignService,
    EventsService
  ],
  exports: [TicketsService]
})
export class TicketsModule {}
