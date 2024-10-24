import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuardFactory } from '@/lib/guards/auth/auth-factory.guard';
import { authGuardKeysArray } from '@/lib/decorators/auth.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authGuardFactory: AuthGuardFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isProtected = this.checkIfProtected(context);

    if (!isProtected) {
      console.log('Endpoint is not protected by any auth guard');
      return true;
    }
    console.log('Endpoint is secure by one of the auth guards');
    const guard = this.authGuardFactory.create(context);
    return guard.canActivate(context);
  }

  private checkIfProtected(context: ExecutionContext): boolean {
    for (const key of authGuardKeysArray) {
      const metadata = this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (metadata !== undefined) {
        return true;
      }
    }
    return false;
  }
}
