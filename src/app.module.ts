import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "@/common/services/database/database.module";
import { JwtModule } from "@nestjs/jwt";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { envVariables } from "@/common/env-variables";
import { AuthGuard } from "@/common/guards/auth/auth.guard";
import { AuthGuardsModule } from "@/common/guards/auth/auth-guards.module";
import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "@/common/services/session/session.module";
import { PrismaExceptionFilter } from "@/common/exceptions/prisma-exception.filter";
import { PublicModule } from "@/public/public.module";
import { PrivateModule } from "@/private/private.module";
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthGuardsModule,
    SessionModule,
    WebhooksModule,
    JwtModule.register({
      global: true,
      secret: envVariables.jwtSecret
    }),
    PrivateModule,
    PublicModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }, {
    provide: APP_FILTER,
    useClass: PrismaExceptionFilter
  }]
})
export class AppModule {}