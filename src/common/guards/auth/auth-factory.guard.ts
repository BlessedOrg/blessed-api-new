import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiKeyGuard } from "@/common/guards/auth/api-key.guard";
import { authGuardKeysArray } from "@/common/decorators/auth.decorator";
import { DeveloperAuthGuard } from "@/common/guards/auth/developer-auth.guard";
import { UserAuthGuard } from "@/common/guards/auth/user-auth.guard";
import { UserAndApiKeyAuthGuard } from "@/common/guards/auth/user-and-api-key-auth.guard";
import { DeveloperOrApiKeyAuthGuard } from "@/common/guards/auth/developer-or-api-key-auth.guard";

@Injectable()
export class AuthGuardFactory {
  private guardMap: Map<string, IAuthGuard>;

  constructor(
    private reflector: Reflector,
    developerAuthGuard: DeveloperAuthGuard,
    userAuthGuard: UserAuthGuard,
    apiKeyGuard: ApiKeyGuard,
    userAndApiKeyGuard: UserAndApiKeyAuthGuard,
    developerOrApiKeyGuard: DeveloperOrApiKeyAuthGuard
  ) {
    this.guardMap = new Map<string, IAuthGuard>([
      ["isDeveloperAuth", developerAuthGuard],
      ["isUserAuth", userAuthGuard],
      ["isApiKeyAuth", apiKeyGuard],
      ["isUserAndApiKeyAuth", userAndApiKeyGuard],
      ["isDeveloperOrApiKeyAuth", developerOrApiKeyGuard]
    ]);
  }
  create(context: ExecutionContext): IAuthGuard {
    const contextProps = [context.getHandler(), context.getClass()];

    for (const key of authGuardKeysArray) {
      const isGuardRequired = this.reflector.getAllAndOverride<boolean>(
        key,
        contextProps
      );
      if (isGuardRequired) {
        if (key === "isPublicRequest") {
          return { canActivate: () => Promise.resolve(true) };
        }
        const guard = this.guardMap.get(key);
        if (guard) {
          return guard;
        }
      }
    }

    throw new Error("No auth guard found");
  }
}
