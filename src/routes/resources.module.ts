import { ApplicationModule } from "@/routes/application/application.module";
import { AudiencesModule } from "@/routes/audiences/audiences.module";
import { CampaignsModule } from "@/routes/campaigns/campaigns.module";
import { DevelopersModule } from "@/routes/developers/developers.module";
import { EventsModule } from "@/routes/events/events.module";
import { TicketsModule } from "@/routes/tickets/tickets.module";
import { UsersModule } from "@/routes/users/users.module";
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
