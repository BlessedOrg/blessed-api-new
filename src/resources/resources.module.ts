import { Module } from "@nestjs/common";
import { AudiencesModule } from "@/resources/audiences/audiences.module";
import { CampaignsModule } from "@/resources/campaigns/campaigns.module";
import { ApplicationModule } from "@/resources/application/application.module";
import { EventsModule } from "@/resources/events/events.module";
import { TicketsModule } from "@/resources/tickets/tickets.module";
import { DevelopersModule } from "@/resources/developers/developers.module";
import { UsersModule } from "@/resources/users/users.module";
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [AudiencesModule, CampaignsModule, ApplicationModule, EventsModule, TicketsModule, DevelopersModule, UsersModule, AnalyticsModule],
  controllers: [],
  providers: []
})
export class ResourcesModule {}
