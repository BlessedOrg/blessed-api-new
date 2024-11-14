import { Module } from '@nestjs/common';
import { TicketsPrivateController } from './tickets-private.controller';
import { TicketsModule } from '@/public/events/tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [TicketsPrivateController],
})
export class TicketsPrivateModule {}
