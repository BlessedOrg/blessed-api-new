import { Body, Controller, Get, Param, Post, Req, UseInterceptors } from "@nestjs/common";
import { TicketsService } from "@/public/events/tickets/tickets.service";
import { CreateTicketDto, SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { RequireApiKey, RequireDeveloperAuth, RequireUserAuth } from "@/common/decorators/auth.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";
import { DistributeDto } from "@/public/events/tickets/dto/distribute.dto";

@Controller("private/tickets")
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

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
  distribute(
    @Body() distributeDto: DistributeDto,
    @Req() req: RequestWithDevAccessToken & TicketValidate & EventValidate & AppValidate
  ) {
    return this.ticketsService.distribute(distributeDto, {
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
  getEventTickets(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate) {
    return this.ticketsService.getEventTickets(req.appId, req.eventId);
  }

  @RequireUserAuth()
  @Get("owned")
  async getOwnedTickets(@Req() req: RequestWithUserAccessToken) {
    return await this.ticketsService.getOwnedTickets(req.userId);
  }

  @RequireUserAuth()
  @Post("verify")
  async verifyUserTicket(@Body() body: { code: string, eventId: string, ticketId: string }, @Req() req: RequestWithUserAccessToken) {
    return await this.ticketsService.verifyUserTicket(body, req.userId);
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
  eventTicketEntries(@Req() req: RequestWithApiKey & EventValidate & TicketValidate) {
    return this.ticketsService.eventTicketEntries(req.ticketId);
  }
}
