import { Module } from "@nestjs/common";
import { AudiencesController } from "./audiences.controller";
import { UsersModule } from "@/public/users/users.module";
import { AudiencesService } from "@/public/audiences/audiences.service";

@Module({
  imports: [UsersModule],
  providers: [AudiencesService],
  controllers: [AudiencesController]
})
export class AudiencesModule {}
