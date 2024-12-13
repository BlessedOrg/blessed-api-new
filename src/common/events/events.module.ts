import { Module } from "@nestjs/common";
import { TicketCreateEvent } from "@/common/events/ticket-create.event";

@Module({
  imports: [],
  controllers: [],
  providers: [TicketCreateEvent]
})
export class EventsModule {}