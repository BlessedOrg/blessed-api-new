import { DatabaseService } from "@/common/services/database/database.service";
import { CallHandler, ExecutionContext, HttpException, Injectable, mixin, NestInterceptor, Type } from "@nestjs/common";
import { Observable } from "rxjs";

export interface EventIdInterceptorOptions {
  throwError?: boolean;
}

export function EventIdInterceptor(
  options: EventIdInterceptorOptions = {}
): Type<NestInterceptor> {
  @Injectable()
  class EventIdInterceptorMixin implements NestInterceptor {
    private readonly isCuid = (str: string): boolean => /^c[a-z0-9]{24}$/.test(str);
    
    constructor(private readonly database: DatabaseService) {}

    async intercept(
      context: ExecutionContext, 
      next: CallHandler
    ): Promise<Observable<any>> {

      const request = context.switchToHttp().getRequest();
      const eventParam = request?.params["event"];

      if (eventParam) {
        const event = await this.findEvent(eventParam);

        if (event?.id) {
          this.enrichRequest(request, event);
        } else if (options.throwError) {
          throw new HttpException("Event not found", 404);
        }
      }

      return next.handle();
    }

    private async findEvent(eventParam: string) {
      const select = { id: true, slug: true };

      if (!this.isCuid(eventParam)) {
        return this.database.event.findUnique({
          where: { slug: eventParam },
          select
        });
      }

      return this.database.event.findUnique({
        where: { id: eventParam },
        select
      });
    }

    private enrichRequest(
      request: any, 
      event: { id: string; slug: string }
    ): void {
      request["eventId"] = event.id;
      request["eventSlug"] = event.slug;
    }
  }

  return mixin(EventIdInterceptorMixin);
}
