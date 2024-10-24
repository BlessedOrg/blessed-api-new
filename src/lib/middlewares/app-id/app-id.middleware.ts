import { HttpException, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";
import { DatabaseService } from "@/services/database/database.service";

@Injectable()
export class AppIdMiddleware implements NestMiddleware {
  constructor(private database: DatabaseService) {}
  async use(req: any, res: Response, next: NextFunction) {
    const appParam = req?.params["app"];

    if (appParam) {
      const isCuid = (str: string) => /^c[a-z0-9]{24}$/.test(str);

      if (!isCuid(appParam)) {
        const app = await this.database.app.findUnique({
          where: { slug: appParam },
          select: { id: true }
        });
        if (app?.id) {
          req["appId"] = app.id;
        } else {
          throw new HttpException("App not found", 404);
        }
      } else {
        const app = await this.database.app.findUnique({
          where: { id: appParam },
          select: { id: true }
        });
        if (app?.id) {
          req["appId"] = appParam;
        } else {
          throw new HttpException("App not found", 404);
        }
      }
    }

    next();
  }
}
