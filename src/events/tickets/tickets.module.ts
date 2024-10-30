import { Module } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController } from "./tickets.controller";
import { UsersModule } from "@/users/users.module";
import { EmailModule } from "@/common/services/email/email.module";
import { TicketIdInterceptor } from "@/common/interceptors/ticket-id-interceptor";

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketIdInterceptor]
})
export class TicketsModule {}
