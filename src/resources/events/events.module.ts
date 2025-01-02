import { UsersModule } from "@/resources/users/users.module";
import { Module } from "@nestjs/common";
import { StakeholdersModule } from '../stakeholders/stakeholders.module';
import { EventsController, EventsPrivateController } from "./events.controller";
import { EventsService } from "./events.service";

@Module({
  imports: [UsersModule, StakeholdersModule],
  controllers: [EventsController, EventsPrivateController],
  providers: [EventsService],
  exports: [EventsService]
})
export class EventsModule {}