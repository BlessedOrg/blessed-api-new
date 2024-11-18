import { Module } from "@nestjs/common";
import { DevelopersModule } from "@/private/developers/developers.module";
import { ApplicationsModule } from "@/private/applications/applications.module";
import { AudiencesModule } from "@/private/audiences/audiences.module";
import { TicketsModule } from "@/private/tickets/tickets.module";
import { EventsModule } from "@/private/events/events.module";
import { CampaignsModule } from "@/private/campaigns/campaigns.module";

@Module({
  imports: [
    DevelopersModule,
    ApplicationsModule,
    AudiencesModule,
    TicketsModule,
    EventsModule,
    CampaignsModule
  ],
  controllers: [],
  providers: []
})
export class PrivateModule {}
