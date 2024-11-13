import { Module } from '@nestjs/common';
import { DevelopersModule } from '@/private/developers/developers.module';
import { ApplicationsModule } from '@/private/applications/applications.module';
import { AudiencesPrivateModule } from './audiences-private/audiences-private.module';
import { TicketsPrivateModule } from './tickets-private/tickets-private.module';
import { EventsPrivateModule } from './events-private/events-private.module';
import { CampaignsPrivateModule } from './campaigns-private/campaigns-private.module';

@Module({
  imports: [
    DevelopersModule,
    ApplicationsModule,
    AudiencesPrivateModule,
    TicketsPrivateModule,
    EventsPrivateModule,
    CampaignsPrivateModule,
  ],
  controllers: [],
  providers: [],
})
export class PrivateModule {}
