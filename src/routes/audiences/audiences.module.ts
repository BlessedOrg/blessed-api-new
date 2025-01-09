import { Module } from "@nestjs/common";
import { AudiencesService } from "./audiences.service";
import { AudiencesController, AudiencesPrivateController } from "./audiences.controller";
import { UsersModule } from "@/routes/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AudiencesController, AudiencesPrivateController],
  providers: [AudiencesService],
  exports: [AudiencesService]
})
export class AudiencesModule {}
