import { Body, Controller, Get, Param, Post, Query, Req, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { PublicRequest, RequireApiKey } from "@/common/decorators/auth.decorator";
import { CreateTicketDto, SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { SupplyDto } from "@/public/events/tickets/dto/supply.dto";
import { WhitelistDto } from "@/public/events/tickets/dto/whitelist.dto";
import { DistributeDto } from "@/public/events/tickets/dto/distribute.dto";
import { EmailDto } from "@/common/dto/email.dto";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";
import { WebhooksDto } from "@/webhooks/webhooks.dto";

@RequireApiKey()
@UseEventIdInterceptor()
@Controller("events/:event/tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: RequestWithApiKey & EventValidate
  ) {
    return this.ticketsService.create(createTicketDto, req);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/details")
  details(@Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.getTicketDetails(req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/supply")
  supply(
    @Body() supplyDto: SupplyDto,
    @Req() req: RequestWithApiKey & TicketValidate
  ) {
    return this.ticketsService.supply(supplyDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/whitelist")
  whitelist(
    @Body() whitelistDto: WhitelistDto,
    @Req() req: RequestWithApiKey & TicketValidate
  ) {
    return this.ticketsService.whitelist(whitelistDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/distribute")
  distribute(
    @Body() distributeDto: DistributeDto,
    @Req() req: RequestWithApiKey & TicketValidate & EventValidate
  ) {
    return this.ticketsService.distribute(distributeDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/distributeToExternal")
  distributeTicketsToExternalWallets(
    @Body() body: { users: { wallet: string; amount: number }[] },
    @Req() req: RequestWithApiKey & TicketValidate & EventValidate
  ) {
    const {
      ticketContractAddress,
      developerWalletAddress,
      capsuleTokenVaultKey
    } = req;
    return this.ticketsService.distributeTicketsToExternalWallets(
      body.users,
      ticketContractAddress,
      developerWalletAddress,
      capsuleTokenVaultKey
    );
  }

  @PublicRequest()
  @UseTicketIdInterceptor()
  @Get(":ticketId/show-ticket/:tokenId")
  showTicket(
    @Req() req: RequestWithApiKey & TicketValidate & EventValidate,
    @Param("tokenId") tokenId: string,
    @Query("userId") userId?: string
  ) {
    return this.ticketsService.showTicket(req, tokenId, userId);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/owners")
  owners(@Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.owners(req.ticketContractAddress);
  }

  @UseInterceptors(SnapshotInterceptor)
  @Post("snapshot")
  snapshot(@Body() snapshotDto: SnapshotDto) {
    return this.ticketsService.snapshot(snapshotDto);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/:email")
  ownerByEmail(
    @Req() req: RequestWithApiKey & TicketValidate,
    @Param(new ValidationPipe({ transform: true })) params: EmailDto
  ) {
    return this.ticketsService.ownerByEmail(params.email, req);
  }

  @Get()
  contracts(@Req() req: RequestWithApiKey) {
    return this.ticketsService.contracts(req.appId);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/checkout-session")
  checkoutSession(@Req() req: RequestWithApiKey & TicketValidate, @Body() webhooksDto: WebhooksDto) {
    return this.ticketsService.getCheckoutSession(webhooksDto, req);
  }
}
