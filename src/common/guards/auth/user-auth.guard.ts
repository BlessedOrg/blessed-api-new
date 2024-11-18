import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { envVariables } from "@/common/env-variables";
import { extractTokenFromHeader } from "@/utils/requests/extractTokenFromHeader";
import { SessionService } from "@/common/services/session/session.service";

@Injectable()
export class UserAuthGuard implements IAuthGuard {
  constructor(private jwtService: JwtService, private sessionService: SessionService) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("User Access Token is required.");
    }
    try {
      const decoded = this.jwtService.verify(token, { secret: envVariables.jwtSecret }) as UserAccessTokenJWT;
      await this.sessionService.checkIsSessionValid(decoded.userId, "user");

      Object.assign(request, decoded);
      return true;
    } catch (e) {
      throw new UnauthorizedException(e.message);
    }
  }
}
