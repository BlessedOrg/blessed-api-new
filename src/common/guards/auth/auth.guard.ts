import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuardFactory } from "@/common/guards/auth/auth-factory.guard";
import { authGuardKeysArray } from "@/common/decorators/auth.decorator";
import { Reflector } from "@nestjs/core";
import { envConstants } from "@/common/constants";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authGuardFactory: AuthGuardFactory
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isProtected = this.checkIfProtected(context);

    if (!isProtected) {
      if (envConstants.isDevelopment) {
        console.log("Endpoint is not protected by any auth guard");
      }
      return true;
    }
    if (envConstants.isDevelopment) {
      console.log("Endpoint is secure by one of the auth guards");
    }
    const guard = this.authGuardFactory.create(context);
    return guard.canActivate(context);
  }

  private checkIfProtected(context: ExecutionContext): boolean {
    for (const key of authGuardKeysArray) {
      const metadata = this.reflector.getAllAndOverride<boolean>(key, [
        context.getHandler(),
        context.getClass()
      ]);
      if (metadata !== undefined) {
        return true;
      }
    }
    return false;
  }
}
