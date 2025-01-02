import { DatabaseService } from "@/common/services/database/database.service";
import { CallHandler, ExecutionContext, HttpException, Injectable, mixin, NestInterceptor, NotFoundException, Type } from "@nestjs/common";
import { Observable } from "rxjs";

export interface TicketIdInterceptorOptions {
  throwError?: boolean;
}
export function TicketIdInterceptor(
  options: TicketIdInterceptorOptions = {}
): Type<NestInterceptor> {
  @Injectable()
  class TicketIdInterceptorMixin implements NestInterceptor {
    constructor(private readonly database: DatabaseService) {}

    async intercept(
      context: ExecutionContext, 
      next: CallHandler
    ): Promise<Observable<any>> {
      const request = context.switchToHttp().getRequest();
      const ticketParam = request?.params["ticketId"];
      const appId = request?.appId;

      if (!ticketParam && !!options.throwError) {
        throw new NotFoundException("Ticket id param is required");
      } else if (!ticketParam) {
        return next.handle();
      }

      const ticketRecord = await this.database.ticket.findUnique({
        where: {
          appId,
          id: ticketParam
        },
        select: { id: true, address: true }
      });

      if (!ticketRecord && !!options.throwError) {
        throw new HttpException("Ticket not found", 404);
      }

      request["ticketId"] = ticketParam;
      request["ticketContractAddress"] = ticketRecord?.address;

      return next.handle();
    }
  }

  return mixin(TicketIdInterceptorMixin);
}