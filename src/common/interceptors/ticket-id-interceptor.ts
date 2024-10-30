import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor, NotFoundException } from "@nestjs/common";
import { Observable } from "rxjs";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class TicketIdInterceptor implements NestInterceptor {
  constructor(private database: DatabaseService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const ticketParam = request?.params["ticketId"];
    const appId = request?.appId;

    if (!ticketParam) {
      throw new NotFoundException("Ticket id param is required");
    }

    const ticketRecord = await this.database.smartContract.findUnique({
      where: {
        appId,
        name: "tickets",
        id: ticketParam
      },
      select: { id: true, address: true }
    });

    if (!ticketRecord) {
      throw new HttpException("Ticket not found", 404);
    }

    request["ticketId"] = ticketParam;
    request["ticketContractAddress"] = ticketRecord.address;

    return next.handle();
  }
}