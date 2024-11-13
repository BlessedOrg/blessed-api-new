import { Module } from '@nestjs/common';
import { AudiencesPrivateController } from './audiences-private.controller';
import { UsersModule } from '@/public/users/users.module';
import { AudiencesService } from '@/public/audiences/audiences.service';

@Module({
  imports: [UsersModule],
  providers: [AudiencesService],
  controllers: [AudiencesPrivateController],
})
export class AudiencesPrivateModule {}
