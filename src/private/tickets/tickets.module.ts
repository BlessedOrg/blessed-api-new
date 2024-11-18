import { Module } from "@nestjs/common";
import { TicketsController } from "./tickets.controller";
import { TicketsModule as PublicTicketsModule } from "@/public/events/tickets/tickets.module";

@Module({
  imports: [PublicTicketsModule],
  controllers: [TicketsController]
})
export class TicketsModule {}
