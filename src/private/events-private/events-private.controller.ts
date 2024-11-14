import { Controller, Get, Req } from "@nestjs/common";
import { EventsService } from "@/public/events/events.service";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";

@RequireDeveloperAuth()
@Controller("private/events")
export class EventsPrivateController {
  constructor(private eventsService: EventsService) {}

  @Get()
  getAllEvents(@Req() req: RequestWithDevAccessToken) {
    return this.eventsService.getAllEvents(req.developerId);
  }
}
