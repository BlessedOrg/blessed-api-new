import { Body, Controller, Delete, Get, Patch, Post, Req } from "@nestjs/common";
import { EventsService } from "@/public/events/events.service";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { CreateEventDto } from "@/public/events/dto/create-event.dto";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UpdateEventDto } from "@/public/events/dto/update-event.dto";
import { EmailDto } from "@/common/dto/email.dto";

@RequireDeveloperAuth()
@Controller("private/events")
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  getAllEvents(@Req() req: RequestWithDevAccessToken) {
    return this.eventsService.getAllEvents(req.developerId);
  }

  @UseAppIdInterceptor()
  @Get(":app")
  getAppEvents(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.eventsService.events(req.appId);
  }

  @UseEventIdInterceptor()
  @UseAppIdInterceptor()
  @Get(":app/:event")
  getAppEvent(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate) {
    return this.eventsService.details(req.appId, req.eventId);
  }

  @UseEventIdInterceptor()
  @UseAppIdInterceptor()
  @Patch(":app/:event")
  updateEvent(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(req.appId, req.eventId, updateEventDto);
  }

  @UseEventIdInterceptor()
  @UseAppIdInterceptor()
  @Post(":app/:event/bouncer")
  addEventBouncer(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate, @Body() emailDto: EmailDto) {
    return this.eventsService.addEventBouncer(req.developerId, req.appId, req.eventId, emailDto);
  }

  @UseEventIdInterceptor()
  @UseAppIdInterceptor()
  @Delete(":app/:event/bouncer")
  removeEventBouncer(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate, @Body() emailDto: EmailDto) {
    return this.eventsService.removeEventBouncer(req.appId, req.eventId, emailDto);
  }

  @UseAppIdInterceptor()
  @Post(":app")
  create(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() createEventDto: CreateEventDto
  ) {
    return this.eventsService.create(
      createEventDto,
      req.appId,
      req.walletAddress,
      req.smartWalletAddress
    );
  }
}
