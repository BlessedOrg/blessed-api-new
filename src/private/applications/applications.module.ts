import { Module } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { ApiKeyModule } from "@/private/applications/api-key/api-key.module";
import { AppIdInterceptor } from "@/common/interceptors/app-id.interceptor";

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService, AppIdInterceptor],
  imports: [ApiKeyModule]
})
export class ApplicationsModule {}