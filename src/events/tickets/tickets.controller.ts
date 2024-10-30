import { Body, Controller, Get, Param, Post, Query, Req, ValidationPipe } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { PublicRequest, RequireApiKey } from "@/common/decorators/auth.decorator";
import { CreateTicketDto } from "@/events/tickets/dto/create-ticket.dto";
import { SupplyDto } from "@/events/tickets/dto/supply.dto";
import { WhitelistDto } from "@/events/tickets/dto/whitelist.dto";
import { DistributeDto } from "@/events/tickets/dto/distribute.dto";
import { EmailDto } from "@/common/dto/email.dto";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";

@RequireApiKey()
@UseEventIdInterceptor()
@Controller("events/:event/tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Req() req: RequestWithApiKey & EventValidate) {
    return this.ticketsService.create(createTicketDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/supply")
  supply(@Body() supplyDto: SupplyDto, @Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.supply(supplyDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/whitelist")
  whitelist(@Body() whitelistDto: WhitelistDto, @Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.whitelist(whitelistDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/distribute")
  distribute(@Body() distributeDto: DistributeDto, @Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.distribute(distributeDto, req);
  }

  @PublicRequest()
  @UseTicketIdInterceptor()
  @Get(":ticketId/show-ticket/:tokenId")
  showTicket(@Req() req: RequestWithApiKey & TicketValidate, @Param("tokenId") tokenId: string, @Query("userId") userId?: string
  ) {
    return this.ticketsService.showTicket(req, tokenId, userId);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/owners")
  owners(@Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.owners(req);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/:email")
  ownerByEmail(@Req() req: RequestWithApiKey & TicketValidate, @Param(new ValidationPipe({ transform: true })) params: EmailDto) {
    return this.ticketsService.ownerByEmail(params.email, req);
  }

  @Get()
  contracts(@Req() req: RequestWithApiKey) {
    return this.ticketsService.contracts(req.appId);
  }
}
