import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { EntranceService } from "./entrance.service";
import { CreateEntranceDto } from "@/events/entrance/dto/create-entrance.dto";
import { EntryDto } from "@/events/entrance/dto/entry.dto";
import { RequireApiKey, RequireUserAndApiKey } from "@/common/decorators/auth.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";

@UseEventIdInterceptor()
@Controller("events/:event/entrance")
export class EntranceController {
  constructor(private readonly entranceService: EntranceService) {}

  @RequireApiKey()
  @Post("create")
  create(@Req() req: RequestWithApiKey & EventValidate, @Body() createEntranceDto: CreateEntranceDto) {
    return this.entranceService.create(createEntranceDto, req);
  }

  @RequireUserAndApiKey()
  @Post(":entranceId")
  entry(@Req() req: RequestWithApiKeyAndUserAccessToken, @Body() entryDto: EntryDto, @Param("entranceId") entranceId: string) {
    return this.entranceService.entry(entryDto, entranceId, req);
  }

  @RequireApiKey()
  @Get()
  all(@Req() req: RequestWithApiKey) {
    return this.entranceService.all(req.appId);
  }
}
