import { Module } from "@nestjs/common";
import { AuthGuardFactory } from "@/lib/guards/auth/auth-factory.guard";
import { ApiKeyGuard } from "@/lib/guards/auth/api-key.guard";
import { AuthGuard } from "@/lib/guards/auth/auth.guard";
import { DeveloperAuthGuard } from "@/lib/guards/auth/developer-auth.guard";
import { UserAuthGuard } from "@/lib/guards/auth/user-auth.guard";
import { UserAndApiKeyAuthGuard } from "@/lib/guards/auth/user-and-api-key-auth.guard";
import { DeveloperOrApiKeyAuthGuard } from "@/lib/guards/auth/developer-or-api-key-auth.guard";
import { SessionModule } from "@/session/session.module";

@Module({
  imports: [SessionModule],
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
