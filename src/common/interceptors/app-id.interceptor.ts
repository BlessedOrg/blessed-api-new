import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class AppIdInterceptor implements NestInterceptor {
  constructor(private database: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const appParam = request?.params["app"];
    const devId = request?.developerId;

    if (appParam) {
      const isCuid = (str: string) => /^c[a-z0-9]{24}$/.test(str);
      const select = { id: true, DeveloperAccount: { select: { walletAddress: true } } };

      let app;
      if (!isCuid(appParam)) {
        app = await this.database.app.findUnique({
          where: { slug: appParam },
          select
        });
      } else {
        app = await this.database.app.findUnique({
          where: { id: appParam },
          select
        });
      }

      if (app?.id) {
        request["appId"] = app.id;
        request["appOwnerWalletAddress"] = app.DeveloperAccount.walletAddress;
      } else {
        throw new HttpException("App not found", 404);
      }
    }
    const isDeveloperOwnerOfApplication = await this.database.app.findUnique({
      where: { id: request["appId"], developerId: devId }
    });

    if (!isDeveloperOwnerOfApplication) {
      throw new HttpException("Unauthorized, developer is not the owner of the app try to use different API Key", 401);
    }

    return next.handle();
  }
}