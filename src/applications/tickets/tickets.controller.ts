import { Body, Controller, Get, Param, Post, Query, Req, ValidationPipe } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { PublicRequest, RequireDeveloperAuthOrApiKey } from "@/common/decorators/auth.decorator";
import { CreateTicketDto } from "@/applications/tickets/dto/create-ticket.dto";
import { SupplyDto } from "@/applications/tickets/dto/supply.dto";
import { WhitelistDto } from "@/applications/tickets/dto/whitelist.dto";
import { DistributeDto } from "@/applications/tickets/dto/distribute.dto";
import { EmailDto } from "@/common/dto/email.dto";

@RequireDeveloperAuthOrApiKey()
@Controller("applications/:app/tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post("create")
  create(@Body() createTicketDto: CreateTicketDto, @Req() req: RequestWithApiKey & AppValidate) {
    return this.ticketsService.create(createTicketDto, req);
  }

  @Post(":ticketId/supply")
  supply(@Body() supplyDto: SupplyDto, @Req() req: RequestWithApiKey & AppValidate & TicketValidate) {
    return this.ticketsService.supply(supplyDto, req);
  }

  @Post(":ticketId/whitelist")
  whitelist(@Body() whitelistDto: WhitelistDto, @Req() req: RequestWithApiKey & AppValidate & TicketValidate) {
    return this.ticketsService.whitelist(whitelistDto, req);
  }

  @Post(":ticketId/distribute")
  distribute(@Body() distributeDto: DistributeDto, @Req() req: RequestWithApiKey & AppValidate & TicketValidate) {
    return this.ticketsService.distribute(distributeDto, req);
  }

  @PublicRequest()
  @Get(":ticketId/show-ticket/:tokenId")
  showTicket(@Req() req: RequestWithApiKey & AppValidate & TicketValidate, @Param("tokenId") tokenId: string, @Query("userId") userId?: string
  ) {
    return this.ticketsService.showTicket(req, tokenId, userId);
  }

  @Get(":ticketId/owners")
  owners(@Req() req: RequestWithApiKey & AppValidate & TicketValidate) {
    return this.ticketsService.owners(req);
  }

  @Get(":ticketId/:email")
  ownerByEmail(@Req() req: RequestWithApiKey & AppValidate & TicketValidate, @Param(new ValidationPipe({ transform: true })) params: EmailDto) {
    return this.ticketsService.ownerByEmail(params.email, req);
  }

  @Get()
  contracts(@Req() req: AppValidate) {
    return this.ticketsService.contracts(req.appId);
  }
}
