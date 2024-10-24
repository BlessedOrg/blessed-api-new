import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { EmailModule } from "@/services/email/email.module";
import { SessionModule } from "@/session/session.module";

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}