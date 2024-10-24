import { Module } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";
import { ApiKeyModule } from "./api-key/api-key.module";

@Module({
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  imports: [ApiKeyModule]
})
export class ApplicationsModule {}
