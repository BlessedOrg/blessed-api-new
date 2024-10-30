import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { EventsService } from "./events.service";
import { RequireApiKey } from "@/common/decorators/auth.decorator";
import { CreateEventDto } from "@/events/dto/create-event.dto";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";

@RequireApiKey()
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@Req() req: RequestWithApiKey, @Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto, req.appId);
  }

  @Get()
  events(@Req() req: RequestWithApiKey) {
    return this.eventsService.events(req.appId);
  }

  @UseEventIdInterceptor()
  @Get(":event")
  details(@Req() req: RequestWithApiKey & EventValidate) {
    return this.eventsService.details(req.eventId);
  }
}
