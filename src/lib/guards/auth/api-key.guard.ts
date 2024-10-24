import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { envConstants } from '@/lib/constants';

@Injectable()
export class ApiKeyGuard implements IAuthGuard {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['blessed-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Api Key is required.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(apiKey, {
        secret: envConstants.jwtSecret,
      });
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
