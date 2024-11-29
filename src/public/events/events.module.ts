import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController } from "./events.controller";
import { EntranceModule } from "@/public/events/entrance/entrance.module";
import { TicketsModule } from "@/public/events/tickets/tickets.module";
import { EventIdInterceptor } from "@/common/interceptors/param-protect/event-id-interceptor";
import { UsersModule } from "@/public/users/users.module";

@Module({
  imports: [EntranceModule, TicketsModule, UsersModule],
  controllers: [EventsController],
  providers: [EventsService, EventIdInterceptor],
  exports: [EventsService]
})
export class EventsModule {}
