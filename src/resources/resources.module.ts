import { ApplicationModule } from "@/resources/application/application.module";
import { AudiencesModule } from "@/resources/audiences/audiences.module";
import { CampaignsModule } from "@/resources/campaigns/campaigns.module";
import { DevelopersModule } from "@/resources/developers/developers.module";
import { EventsModule } from "@/resources/events/events.module";
import { TicketsModule } from "@/resources/tickets/tickets.module";
import { UsersModule } from "@/resources/users/users.module";
import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { StakeholdersModule } from "./stakeholders/stakeholders.module";

@Module({
  imports: [
    AudiencesModule,
    CampaignsModule,
    ApplicationModule,
    EventsModule,
    TicketsModule,
    DevelopersModule,
    UsersModule,
    AnalyticsModule,
    StakeholdersModule,
  ],
  controllers: [],
  providers: [],
})
export class ResourcesModule {}
