import { Module } from "@nestjs/common";
import { ApiKeyPrivateController } from "@/public/application/api-key/api-key.controller";
import { ApiKeyPrivateService } from "@/public/application/api-key/api-key.service";

@Module({
  controllers: [ApiKeyPrivateController],
  providers: [ApiKeyPrivateService],
  exports: [ApiKeyPrivateService]
})
export class ApiKeyModule {}
