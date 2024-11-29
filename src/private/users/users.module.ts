import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "@/public/users/users.service";
import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "@/common/services/session/session.module";

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
