import { Module } from "@nestjs/common";
import { DevelopersService } from "./developers.service";
import { DevelopersPrivateController } from "./developers.controller";
import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "@/common/services/session/session.module";

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [DevelopersPrivateController],
  providers: [DevelopersService]
})
export class DevelopersModule {}
