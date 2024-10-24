import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { envConstants } from "@/lib/constants";
import { extractTokenFromHeader } from "@/utils/requests/extractTokenFromHeader";
import { getVaultItem } from "@/lib/1pwd-vault";
import { SessionService } from "@/session/session.service";

@Injectable()
export class DeveloperAuthGuard implements IAuthGuard {
  constructor(private jwtService: JwtService, private sessionService: SessionService) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("Developer Access Token is required.");
    }
    const decoded = this.jwtService.verify(token, { secret: envConstants.jwtSecret }) as DeveloperAccessTokenJWT;

    await this.sessionService.checkIsSessionValid(decoded.developerId, "developer");
    const itemFromVault = await getVaultItem(decoded?.accessTokenVaultKey, "accessToken");
    const isTokenExists = itemFromVault?.fields?.some(i => i.value === token);
    const isTokenInitialized = itemFromVault.fields?.find(i => i.id === "accessToken").value === "none";
    if (!isTokenExists || isTokenInitialized) {
      throw new UnauthorizedException("Invalid developer access token.");
    }

    Object.assign(request, decoded);
    return true;
  }
}
