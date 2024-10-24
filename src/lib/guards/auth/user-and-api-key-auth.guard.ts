import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ApiKeyGuard } from "./api-key.guard";
import { UserAuthGuard } from "./user-auth.guard";

@Injectable()
export class UserAndApiKeyAuthGuard implements IAuthGuard {
  constructor(
    private apiKeyGuard: ApiKeyGuard,
    private userAuthGuard: UserAuthGuard
  ) {}

  async canActivate(context: any): Promise<boolean> {
    try {
      await this.apiKeyGuard.canActivate(context);
      await this.userAuthGuard.canActivate(context);
      return true;
    } catch (error) {
      throw new UnauthorizedException("Both API Key and User Authentication are required.");
    }
  }
}