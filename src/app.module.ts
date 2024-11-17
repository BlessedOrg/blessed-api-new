import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "@/common/services/database/database.module";
import { JwtModule } from "@nestjs/jwt";
import { envVariables } from "@/common/env-variables";
import { DevelopersModule } from "./developers/developers.module";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@/common/guards/auth/auth.guard";
import { AuthGuardsModule } from "@/common/guards/auth/auth-guards.module";
import { EmailModule } from "@/common/services/email/email.module";
import { SessionModule } from "./session/session.module";
import { UsersModule } from "@/users/users.module";
import { ApplicationsModule } from "./applications/applications.module";
import { PrismaExceptionFilter } from "@/common/exceptions/prisma-exception.filter";
import { EventsModule } from "@/events/events.module";
import { ApplicationModule } from "./application/application.module";
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: envVariables.jwtSecret
    }),
    EmailModule,
    DevelopersModule,
    AuthGuardsModule,
    SessionModule,
    UsersModule,
    ApplicationsModule,
    EventsModule,
    ApplicationModule,
    WebhooksModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }, {
    provide: APP_FILTER,
    useClass: PrismaExceptionFilter
  }]
})
export class AppModule {}
