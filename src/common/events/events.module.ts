import { Module } from "@nestjs/common";
import { TicketCreateEvent } from "@/common/events/ticket-create.event";
import { InteractionEvent } from "@/common/events/interaction.event";

@Module({
  imports: [],
  controllers: [],
  providers: [TicketCreateEvent, InteractionEvent]
})
export class EventsModule {}