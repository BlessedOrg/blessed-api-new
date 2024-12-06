import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController, EventsPrivateController } from "./events.controller";
import { EntranceModule } from "@/resources/events/entrance/entrance.module";
import { TicketsModule } from "@/resources/events/tickets/tickets.module";
import { EventIdInterceptor } from "@/common/interceptors/param-protect/event-id-interceptor";
import { UsersModule } from "@/resources/users/users.module";

@Module({
  imports: [EntranceModule, TicketsModule, UsersModule],
  controllers: [EventsController, EventsPrivateController],
  providers: [EventsService, EventIdInterceptor],
  exports: [EventsService]
})
export class EventsModule {}