import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { EntranceModule } from "@/events/entrance/entrance.module";
import { TicketsModule } from "@/events/tickets/tickets.module";
import { EventIdInterceptor } from "@/common/interceptors/event-id-interceptor";

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventIdInterceptor],
  imports: [EntranceModule, TicketsModule]
})
export class EventsModule {}