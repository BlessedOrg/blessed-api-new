import { Module } from "@nestjs/common";
import { SessionService } from "@/common/services/session/session.service";

@Module({
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}

