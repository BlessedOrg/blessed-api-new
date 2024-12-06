import { Module } from "@nestjs/common";
import { AudiencesModule } from "@/resources/audiences/audiences.module";
import { CampaignsModule } from "@/resources/campaigns/campaigns.module";
import { ApplicationModule } from "@/resources/application/application.module";
import { EventsModule } from "@/resources/events/events.module";

@Module({
  imports: [AudiencesModule, CampaignsModule, ApplicationModule, EventsModule],
  controllers: [],
  providers: []
})
export class ResourcesModule {}
