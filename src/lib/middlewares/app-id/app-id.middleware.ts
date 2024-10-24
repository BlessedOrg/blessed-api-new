import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction } from "express";
import { DatabaseService } from "@/lib/database/database.service";

@Injectable()
export class AppIdMiddleware implements NestMiddleware {
  constructor(private database: DatabaseService) {}
  async use(req: any, res: Response, next: NextFunction) {
    const appParam = req?.params["app"];

    if (appParam) {
      const isCuid = (str: string) => /^c[a-z0-9]{24}$/.test(str);

      if (!isCuid(appParam)) {
        try {
          const app = await this.database.app.findUnique({
            where: { slug: appParam },
            select: { id: true }
          });
          if (app?.id) {
            req["appId"] = app.id;
          }
        } catch (e) {
          console.log(e);
        }
      } else {
        req["appId"] = appParam;
      }
    }

    next();
  }
}
