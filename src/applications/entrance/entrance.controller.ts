import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { EntranceService } from "./entrance.service";
import { CreateEntranceDto } from "@/applications/entrance/dto/create-entrance.dto";
import { EntryDto } from "@/applications/entrance/dto/entry.dto";
import { RequireDeveloperAuthOrApiKey, RequireUserAndApiKey } from "@/common/decorators/auth.decorator";

@Controller("applications/:app/entrance")
export class EntranceController {
  constructor(private readonly entranceService: EntranceService) {}

  @RequireDeveloperAuthOrApiKey()
  @Post("create")
  create(@Req() req: RequestWithApiKey & AppValidate, @Body() createEntranceDto: CreateEntranceDto) {
    return this.entranceService.create(createEntranceDto, req);
  }

  @RequireUserAndApiKey()
  @Post(":entranceId")
  entry(@Req() req: RequestWithApiKeyAndUserAccessToken & AppValidate, @Body() entryDto: EntryDto, @Param("entranceId") entranceId: string) {
    return this.entranceService.entry(entryDto, entranceId, req);
  }

  @Get()
  all(@Req() req: RequestWithApiKey & AppValidate) {
    return this.entranceService.all(req.appId);
  }
}
