import { Body, Controller, Get, Post, Req, UseInterceptors } from "@nestjs/common";
import { TicketsService } from "@/public/events/tickets/tickets.service";
import { SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";

@RequireDeveloperAuth()
@Controller("private/tickets")
export class TicketsPrivateController {
  constructor(private ticketsService: TicketsService) {}

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
