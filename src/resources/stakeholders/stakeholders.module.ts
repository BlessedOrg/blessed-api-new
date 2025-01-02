import { EmailModule } from '@/common/services/email/email.module';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { StakeholdersController } from './stakeholders.controller';
import { StakeholdersService } from './stakeholders.service';

@Module({
  controllers: [StakeholdersController],
  providers: [StakeholdersService],
	exports: [StakeholdersService],
	imports: [UsersModule, EmailModule]
})
export class StakeholdersModule {}
