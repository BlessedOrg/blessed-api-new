import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { envVariables } from "@/common/env-variables";
import { ApiKeyPrivateService } from "@/resources/application/api-key/api-key.service";

@Injectable()
export class ApiKeyGuard implements IAuthGuard {
  constructor(private jwtService: JwtService, private apiKeyService: ApiKeyPrivateService) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["blessed-api-key"];

    if (!apiKey) {
      throw new UnauthorizedException("blessed-api-key is required.");
    }

    try {
      const decoded = this.jwtService.verify(apiKey, { secret: envVariables.jwtSecret }) as ApiTokenJWT;

      const data = await this.apiKeyService.validateApiKey(decoded.apiTokenId, apiKey);

      Object.assign(request, data);
      return true;
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }
}
