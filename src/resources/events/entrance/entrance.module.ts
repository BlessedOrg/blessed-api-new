import { Module } from "@nestjs/common";
import { EntranceService } from "./entrance.service";

@Module({
  controllers: [],
  providers: [EntranceService],
  exports: [EntranceService]
})
export class EntranceModule {}
