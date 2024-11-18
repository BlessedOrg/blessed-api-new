import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "@/common/services/session/session.module";

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}