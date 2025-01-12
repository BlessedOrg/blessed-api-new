import { Body, Controller, Get, Param, Post, Req, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { TicketsService } from "./tickets.service";
import { RequireApiKey, RequireDeveloperAuth, RequireUserAuth } from "@/common/decorators/auth.decorator";
import { CreateTicketDto, SnapshotDto } from "@/routes/tickets/dto/create-ticket.dto";
import { SupplyDto } from "@/routes/tickets/dto/supply.dto";
import { WhitelistDto } from "@/routes/tickets/dto/whitelist.dto";
import { DistributeDto } from "@/routes/tickets/dto/distribute.dto";
import { EmailDto } from "@/common/dto/email.dto";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";
import { WebhooksDto } from "@/routes/webhooks/dto/webhooks.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

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
  @Get(":ticketId/details")
  details(@Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.getTicketDetails(req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/supply")
  changeSupply(
    @Body() supplyDto: SupplyDto,
    @Req() req: RequestWithApiKey & TicketValidate
  ) {
    return this.ticketsService.changeSupply(supplyDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/whitelist")
  changeTicketWhitelist(
    @Body() whitelistDto: WhitelistDto,
    @Req() req: RequestWithApiKey & TicketValidate
  ) {
    return this.ticketsService.changeTicketWhitelist(whitelistDto, req);
  }

  @UseTicketIdInterceptor()
  @Post(":ticketId/distribute")
  distributeTickets(
    @Body() distributeDto: DistributeDto,
    @Req() req: RequestWithApiKey & TicketValidate & EventValidate
  ) {
    return this.ticketsService.distributeTickets(distributeDto, req);
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

  @UseTicketIdInterceptor()
  @Get(":ticketId/owners")
  getTicketOwners(@Req() req: RequestWithApiKey & TicketValidate) {
    return this.ticketsService.getTicketOwners(req.ticketContractAddress);
  }

  @UseInterceptors(SnapshotInterceptor)
  @Post("snapshot")
  snapshot(@Body() snapshotDto: SnapshotDto) {
    return this.ticketsService.snapshot(snapshotDto);
  }

  @UseTicketIdInterceptor()
  @Get(":ticketId/:email")
  getTicketOwnersByEmail(
    @Req() req: RequestWithApiKey & TicketValidate,
    @Param(new ValidationPipe({ transform: true })) params: EmailDto
  ) {
    return this.ticketsService.getTicketOwnersByEmail(params.email, req);
  }

  @Get()
  getAllEventTickets(@Req() req: RequestWithApiKey & EventValidate) {
    return this.ticketsService.getAllEventTickets(req.eventId);
  }
}

@Controller("private/tickets")
export class TicketsPrivateController {
  constructor(private ticketsService: TicketsService) {}

  @RequireUserAuth()
  @UseTicketIdInterceptor()
  @Post("checkout-session/:ticketId")
  checkoutSession(@Body() webhooksDto: WebhooksDto) {
    return this.ticketsService.getCheckoutSession(webhooksDto);
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor()
  @Post(":app/:event")
  create(
    @Body() createTicketDto: CreateTicketDto,
    @Req() req: RequestWithDevAccessToken & AppValidate & EventValidate
  ) {
    return this.ticketsService.create(createTicketDto, {
      developerId: req.developerId,
      appId: req.appId,
      capsuleTokenVaultKey: req.capsuleTokenVaultKey,
      developerWalletAddress: req.walletAddress,
      eventId: req.eventId
    });
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor()
  @UseTicketIdInterceptor()
  @Post(":app/:event/:ticketId/distribute")
  distributeTickets(
    @Body() distributeDto: DistributeDto,
    @Req() req: RequestWithDevAccessToken & TicketValidate & EventValidate & AppValidate
  ) {
    return this.ticketsService.distributeTickets(distributeDto, {
      ...req,
      developerWalletAddress: req.walletAddress
    });
  }

  @RequireDeveloperAuth()
  @UseTicketIdInterceptor()
  @Post(":app/:event/:ticketId/distributeToExternal")
  distributeTicketsToExternalWallets(
    @Body() body: { users: { wallet: string; amount: number }[] },
    @Req() req: RequestWithDevAccessToken & TicketValidate & EventValidate & AppValidate
  ) {
    const {
      ticketContractAddress,
      walletAddress,
      capsuleTokenVaultKey
    } = req;
    return this.ticketsService.distributeTicketsToExternalWallets(
      body.users,
      ticketContractAddress,
      walletAddress,
      capsuleTokenVaultKey
    );
  }

  @RequireDeveloperAuth()
  @UseInterceptors(SnapshotInterceptor)
  @Post("snapshot")
  snapshotAudience(@Body() airdropDto: SnapshotDto) {
    return this.ticketsService.snapshot(airdropDto);
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor()
  @Get(":app/:event")
  getAllEventTicketsWithOnchainData(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate) {
    return this.ticketsService.getAllEventTicketsWithOnchainData(req.appId, req.eventId);
  }

  @RequireUserAuth()
  @Get("owned")
  async getOwnedTickets(@Req() req: RequestWithUserAccessToken) {
    return await this.ticketsService.getOwnedTickets(req.userId);
  }

  @RequireUserAuth()
  @Post("verify")
  async verifyUserTicketAndMakeEventEntry(@Body() body: { code: string, eventId: string, ticketId: string }, @Req() req: RequestWithUserAccessToken) {
    return await this.ticketsService.verifyUserTicketAndMakeEventEntry(body, req.userId);
  }

  @RequireUserAuth()
  @UseEventIdInterceptor()
  @UseTicketIdInterceptor()
  @Get(":event/:ticketId/:tokenId/qrcode")
  async getTicketQRCode(@Req() req: RequestWithUserAccessToken & EventValidate & TicketValidate, @Param("tokenId") tokenId: string) {
    return await this.ticketsService.getTicketQrCode({
      userId: req.userId,
      userSmartWalletAddress: req.smartWalletAddress,
      eventId: req.eventId,
      ticketId: req.ticketId,
      tokenId: Number(tokenId)
    });
  }

  @RequireApiKey()
  @UseTicketIdInterceptor()
  @Get(":ticketId/entries")
  getTicketEntries(@Req() req: RequestWithApiKey & EventValidate & TicketValidate) {
    return this.ticketsService.getTicketEntries(req.ticketId);
  }

  @RequireUserAuth()
  @UseEventIdInterceptor()
  @UseTicketIdInterceptor()
  @Get(":event/:ticketId/purchase-details")
  getTicketDetailsForPurchase(@Req() req: RequestWithDevAccessToken & TicketValidate & EventValidate) {
    return this.ticketsService.getTicketDetailsForPurchase(req.eventId, req.ticketId);
  }
}