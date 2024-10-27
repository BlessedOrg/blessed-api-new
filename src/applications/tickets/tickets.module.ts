import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { TicketsController } from "./tickets.controller";
import { TicketIdMiddleware } from "@/common/middlewares/ticket-id/ticket-id.middleware";
import { UsersModule } from "@/applications/users/users.module";
import { EmailModule } from "@/common/services/email/email.module";

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [TicketsController],
  providers: [TicketsService]
})
export class TicketsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TicketIdMiddleware)
      .forRoutes({ path: "applications/:app/tickets/:ticketId/*", method: RequestMethod.ALL });
  }
}
