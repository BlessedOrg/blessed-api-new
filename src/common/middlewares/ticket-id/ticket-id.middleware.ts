import { HttpException, Injectable, NestMiddleware, NotFoundException } from "@nestjs/common";
import { NextFunction } from "express";
import { DatabaseService } from "@/common/services/database/database.service";

@Injectable()
export class TicketIdMiddleware implements NestMiddleware {
  constructor(private database: DatabaseService) {}
  async use(req: any, res: Response, next: NextFunction) {
    const ticketParam = req?.params["ticketId"];
    const appId = req?.appId;

    if (ticketParam) {
      const ticketRecord = await this.database.smartContract.findUnique({
        where: {
          appId,
          name: "tickets",
          id: ticketParam
        },
        select: { id: true, address: true }
      });
      if (ticketRecord) {
        req["ticketId"] = ticketParam;
        req["ticketContractAddress"] = ticketRecord.address;
        next();
      } else {
        throw new HttpException("Ticket not found", 404);
      }
    } else {
      throw new NotFoundException("Ticket id param is required");
    }
  }
}
