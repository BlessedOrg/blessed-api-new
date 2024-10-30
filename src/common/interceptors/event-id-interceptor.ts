import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class EventIdInterceptor implements NestInterceptor {
  constructor(private database: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const eventParam = request?.params["event"];

    if (eventParam) {
      const isCuid = (str: string) => /^c[a-z0-9]{24}$/.test(str);
      const select = { id: true };
      let event;

      if (!isCuid(eventParam)) {
        event = await this.database.event.findUnique({
          where: { slug: eventParam },
          select
        });
      } else {
        event = await this.database.event.findUnique({
          where: { id: eventParam },
          select
        });
      }

      if (event?.id) {
        request["eventId"] = event.id;
      } else {
        throw new HttpException("Event not found", 404);
      }
    }

    return next.handle();
  }
}