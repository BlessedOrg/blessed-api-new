import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { ApiKeyModule } from "./api-key/api-key.module";
import { AppIdMiddleware } from "@/common/middlewares/app-id/app-id.middleware";
import { TicketsModule } from "./tickets/tickets.module";
import { EntranceModule } from './entrance/entrance.module';

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [ApiKeyModule, TicketsModule, EntranceModule]
})
export class ApplicationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppIdMiddleware)
      .forRoutes({ path: "applications/:app*", method: RequestMethod.ALL });
  }
}