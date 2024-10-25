import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "@/common/services/database/database.module";
import { JwtModule } from "@nestjs/jwt";
import { envConstants } from "@/common/constants";
import { DevelopersModule } from "./developers/developers.module";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@/common/guards/auth/auth.guard";
import { AuthGuardsModule } from "@/common/guards/auth/auth-guards.module";
import { EmailModule } from "@/common/services/email/email.module";
import { ConfigModule } from "@nestjs/config";
import { config } from "@/config";
import { SessionModule } from "./session/session.module";
import { UsersModule } from "@/applications/users/users.module";
import { ApplicationsModule } from "./applications/applications.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: envConstants.jwtSecret
    }),
    EmailModule,
    DevelopersModule,
    AuthGuardsModule,
    SessionModule,
    UsersModule,
    ApplicationsModule
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AuthGuard }]
})
export class AppModule {}
