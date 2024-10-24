import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ApiKeyGuard } from "./api-key.guard";
import { DeveloperAuthGuard } from "./developer-auth.guard";

@Injectable()
export class DeveloperOrApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyGuard: ApiKeyGuard,
    private readonly developerAuthGuard: DeveloperAuthGuard
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Try to activate using ApiKeyGuard
      return await this.apiKeyGuard.canActivate(context);
    } catch (error) {
      // If ApiKeyGuard fails, try DeveloperAuthGuard
      try {
        return await this.developerAuthGuard.canActivate(context);
      } catch (error) {
        // If both guards fail, throw an UnauthorizedException
        throw new UnauthorizedException("Access denied by both ApiKey and Developer authentication.");
      }
    }
  }
}