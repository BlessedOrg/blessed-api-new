import { Body, Controller, Get, Post, Req, UseInterceptors } from "@nestjs/common";
import { TicketsService } from "@/public/events/tickets/tickets.service";
import { CreateTicketDto, SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";
import { DistributeDto } from "@/public/events/tickets/dto/distribute.dto";

@RequireDeveloperAuth()
@Controller("private/tickets")
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

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

  @UseInterceptors(SnapshotInterceptor)
  @Post("snapshot")
  snapshotAudience(@Body() airdropDto: SnapshotDto) {
    return this.ticketsService.snapshot(airdropDto);
  }

  @UseAppIdInterceptor()
  @UseEventIdInterceptor()
  @Get(":app/:event")
  getEventTickets(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate) {
    return this.ticketsService.getEventTickets(req.appId, req.eventId);
  }
}
