import { Module } from '@nestjs/common';
import { EventsPrivateController } from './events-private.controller';
import { EventsService } from '@/public/events/events.service';

@Module({
  controllers: [EventsPrivateController],
  providers: [EventsService],
})
export class EventsPrivateModule {}
