import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { EmailModule } from "@/services/email/email.module";
import { SessionModule } from "@/session/session.module";
import { AppIdMiddleware } from "@/lib/middlewares/app-id/app-id.middleware";

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppIdMiddleware)
      .forRoutes("applications/:app/users");
  }
}