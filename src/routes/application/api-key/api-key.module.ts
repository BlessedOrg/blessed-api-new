import { Module } from "@nestjs/common";
import { ApiKeyPrivateController } from "@/routes/application/api-key/api-key.controller";
import { ApiKeyPrivateService } from "@/routes/application/api-key/api-key.service";

@Module({
  controllers: [ApiKeyPrivateController],
  providers: [ApiKeyPrivateService],
  exports: [ApiKeyPrivateService]
})
export class ApiKeyModule {}
