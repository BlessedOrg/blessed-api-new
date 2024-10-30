import { Module } from '@nestjs/common';
import { EntranceService } from './entrance.service';
import { EntranceController } from './entrance.controller';

@Module({
  controllers: [EntranceController],
  providers: [EntranceService],
})
export class EntranceModule {}
