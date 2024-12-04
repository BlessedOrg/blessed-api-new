import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { AudiencesService } from "./audiences.service";
import { RequireApiKey } from "@/common/decorators/auth.decorator";
import { CreateAudiencesDto } from "@/public/audiences/dto/create-audience.dto";

@RequireApiKey()
@Controller("audiences")
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  all(@Req() req: RequestWithApiKey) {
    return this.audiencesService.all(req.appId);
  }
  @Post()
  create(
    @Req() req: RequestWithApiKey,
    @Body() createAudienceDto: CreateAudiencesDto
  ) {
    return this.audiencesService.create(createAudienceDto, req.appId);
  }
}
