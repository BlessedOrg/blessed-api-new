import { Module } from "@nestjs/common";
import { AuthGuardFactory } from "@/common/guards/auth/auth-factory.guard";
import { ApiKeyGuard } from "@/common/guards/auth/api-key.guard";
import { AuthGuard } from "@/common/guards/auth/auth.guard";
import { DeveloperAuthGuard } from "@/common/guards/auth/developer-auth.guard";
import { UserAuthGuard } from "@/common/guards/auth/user-auth.guard";
import { UserAndApiKeyAuthGuard } from "@/common/guards/auth/user-and-api-key-auth.guard";
import { DeveloperOrApiKeyAuthGuard } from "@/common/guards/auth/developer-or-api-key-auth.guard";
import { SessionModule } from "@/common/services/session/session.module";
import { ApiKeyModule } from "@/public/application/api-key/api-key.module";

@Module({
  imports: [SessionModule, ApiKeyModule],
  providers: [
    AuthGuard,
    AuthGuardFactory,
    ApiKeyGuard,
    DeveloperAuthGuard,
    UserAuthGuard,
    UserAndApiKeyAuthGuard,
    DeveloperOrApiKeyAuthGuard
  ],
  exports: [
    AuthGuard,
    AuthGuardFactory,
    ApiKeyGuard,
    DeveloperAuthGuard,
    UserAuthGuard,
    UserAndApiKeyAuthGuard,
    DeveloperOrApiKeyAuthGuard
  ]
})
export class AuthGuardsModule {}
