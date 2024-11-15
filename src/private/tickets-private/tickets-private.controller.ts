import { Body, Controller, Post, UseInterceptors } from "@nestjs/common";
import { TicketsService } from "@/public/events/tickets/tickets.service";
import { SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { SnapshotInterceptor } from "@/common/interceptors/tickets/snapshot.interceptor";

@RequireDeveloperAuth()
@Controller("private/tickets")
export class TicketsPrivateController {
  constructor(private ticketsService: TicketsService) {}

  @UseInterceptors(SnapshotInterceptor)
  @Post("snapshot")
  snapshotAudience(@Body() airdropDto: SnapshotDto) {
    return this.ticketsService.snapshot(airdropDto);
  }

}
