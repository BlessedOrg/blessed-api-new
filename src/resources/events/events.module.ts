import { Module } from "@nestjs/common";
import { EventsService } from "./events.service";
import { EventsController, EventsPrivateController } from "./events.controller";
import { EventIdInterceptor } from "@/common/interceptors/param-protect/event-id-interceptor";
import { UsersModule } from "@/resources/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [EventsController, EventsPrivateController],
  providers: [EventsService, EventIdInterceptor],
  exports: [EventsService]
})
export class EventsModule {}