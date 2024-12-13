import { PublicRequest, RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { EmailDto } from "@/common/dto/email.dto";
import { CreateEventDto } from "@/resources/events/dto/create-event.dto";
import { UpdateEventDto } from "@/resources/events/dto/update-event.dto";
import { Body, Controller, Delete, Get, Patch, Post, Req } from "@nestjs/common";
import { EventsService } from "./events.service";

@RequireApiKey()
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(
    @Req() req: RequestWithApiKey,
    @Body() createEventDto: CreateEventDto
  ) {
    return this.eventsService.create(
      createEventDto,
      req.appId,
      req.developerWalletAddress,
      req.developerSmartWalletAddress,
      req.developerId
    );
  }

  @Get()
  getAllEventsByAppId(@Req() req: RequestWithApiKey) {
    return this.eventsService.getAllEventsByAppId(req.appId);
  }

  @PublicRequest()
  @Get("public")
  getEventsWithPublicData() {
    return this.eventsService.getEventsWithPublicData();
  }
  @UseEventIdInterceptor()
  @Get(":event")
  getEventDetails(@Req() req: RequestWithApiKey & EventValidate) {
    return this.eventsService.getEventDetails(req.appId, req.eventId);
  }
}

@RequireDeveloperAuth()
@Controller("private/events")
export class EventsPrivateController {
  constructor(private eventsService: EventsService) {}

  @Get()
  getAllEvents(@Req() req: RequestWithDevAccessToken) {
    return this.eventsService.getAllEventsByDevId(req.developerId);
  }

  @UseAppIdInterceptor()
  @Get(":app")
  getAllEventsByAppId(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.eventsService.getAllEventsByAppId(req.appId);
  }

  @UseEventIdInterceptor()
  @UseAppIdInterceptor()
  @Get(":app/:event")
  getEventDetails(@Req() req: RequestWithDevAccessToken & AppValidate & EventValidate) {
    return this.eventsService.getEventDetails(req.appId, req.eventId);
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
      req.smartWalletAddress,
      req.developerId
    );
  }
}

