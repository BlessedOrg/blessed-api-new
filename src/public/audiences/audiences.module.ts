import { Module } from "@nestjs/common";
import { AudiencesService } from "./audiences.service";
import { AudiencesController } from "./audiences.controller";
import { UsersModule } from "@/public/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AudiencesController],
  providers: [AudiencesService],
  exports: [AudiencesService]
})
export class AudiencesModule {}
