import { Module } from '@nestjs/common';
import { DevelopersService } from './developers.service';
import { DevelopersController } from './developers.controller';
import { EmailModule } from '@/services/email/email.module';
import { SessionModule } from '@/session/session.module';

@Module({
  imports: [EmailModule, SessionModule],
  controllers: [DevelopersController],
  providers: [DevelopersService],
})
export class DevelopersModule {}
