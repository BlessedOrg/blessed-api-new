import { Module } from "@nestjs/common";
import { EventsController } from "./events.controller";
import { EventsService } from "@/public/events/events.service";
import { UsersModule } from "@/public/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [EventsController],
  providers: [EventsService]
})
export class EventsModule {}
