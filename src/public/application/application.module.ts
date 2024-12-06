import { Module } from "@nestjs/common";
import { ApplicationPrivateService, ApplicationService } from "./application.service";
import { ApplicationController, ApplicationPrivateController } from "./application.controller";
import { ApiKeyModule } from "@/public/application/api-key/api-key.module";

@Module({
  controllers: [ApplicationController, ApplicationPrivateController],
  providers: [ApplicationService, ApplicationPrivateService],
  imports: [ApiKeyModule]
})
export class ApplicationModule {}
