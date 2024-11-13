import { Body, Controller, Post } from '@nestjs/common';
import { TicketsService } from '@/public/events/tickets/tickets.service';
import { SnapshotDto } from '@/public/events/tickets/dto/create-ticket.dto';
import { RequireDeveloperAuth } from '@/common/decorators/auth.decorator';

@RequireDeveloperAuth()
@Controller('private/tickets')
export class TicketsPrivateController {
  constructor(private ticketsService: TicketsService) {}

  @Post('snapshot')
  snapshotAudience(@Body() airdropDto: SnapshotDto) {
    return this.ticketsService.snapshot(airdropDto);
  }
}
