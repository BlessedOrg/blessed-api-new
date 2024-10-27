import { HttpException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class AppIdMiddleware implements NestMiddleware {
  constructor(private database: DatabaseService) {}
  async use(req: any, res: Response, next: NextFunction) {
    const appParam = req?.params["app"];
    if (appParam) {
      const isCuid = (str: string) => /^c[a-z0-9]{24}$/.test(str);
      const select = { id: true, DeveloperAccount: { select: { walletAddress: true } } };
      if (!isCuid(appParam)) {
        const app = await this.database.app.findUnique({
          where: { slug: appParam },
          select
        });
        if (app?.id) {
          req["appId"] = app.id;
          req["appOwnerWalletAddress"] = app.DeveloperAccount.walletAddress;
        } else {
          throw new HttpException("App not found", 404);
        }
      } else {
        const app = await this.database.app.findUnique({
          where: { id: appParam },
          select
        });
        if (app?.id) {
          req["appId"] = appParam;
          req["appOwnerWalletAddress"] = app.DeveloperAccount.walletAddress;
        } else {
          throw new HttpException("App not found", 404);
        }
      }
    }

    next();
  }
}
