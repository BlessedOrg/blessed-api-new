import { Module } from "@nestjs/common";
import { AudiencesModule } from "@/public/audiences/audiences.module";
import { CampaignsModule } from "@/public/campaigns/campaigns.module";
import { ApplicationModule } from "@/public/application/application.module";
import { EventsModule } from "@/public/events/events.module";

@Module({
  imports: [AudiencesModule, CampaignsModule, ApplicationModule, EventsModule],
  controllers: [],
  providers: []
})
export class PublicModule {}
