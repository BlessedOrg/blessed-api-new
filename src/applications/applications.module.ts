import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { ApiKeyModule } from "./api-key/api-key.module";
import { AppIdMiddleware } from "@/lib/middlewares/app-id/app-id.middleware";

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [ApiKeyModule]
})
export class ApplicationsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppIdMiddleware)
      .forRoutes({ path: "applications/:app", method: RequestMethod.ALL }, { path: "applications/:app/*", method: RequestMethod.ALL });
  }
}