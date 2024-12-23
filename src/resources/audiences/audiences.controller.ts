import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { AudiencesService } from "./audiences.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { CreateAudiencesDto } from "@/resources/audiences/dto/create-audience.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@RequireApiKey()
@Controller("audiences")
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  getAllAudiences(@Req() req: RequestWithApiKey) {
    return this.audiencesService.getAllAudiences(req.appId);
  }
  @Post()
  create(@Req() req: RequestWithApiKey, @Body() createAudienceDto: CreateAudiencesDto) {
    return this.audiencesService.create(createAudienceDto, req.appId);
  }
}

@RequireDeveloperAuth()
@UseAppIdInterceptor()
@Controller("private/apps/:app/audiences")
export class AudiencesPrivateController {
  constructor(private audienceService: AudiencesService) {}

  @Get()
  getAllAudiences(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.audienceService.getAllAudiences(req.appId);
  }

  @Post()
  createAudience(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() createCampaignDto: CreateAudiencesDto
  ) {
    return this.audienceService.create(createCampaignDto, req.appId);
  }

  @Patch(":audienceId")
  updateAudience(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() updateAudienceDto: { name?: string },
    @Param("audienceId") audienceId: string
  ) {
    return this.audienceService.update(
      req.appId,
      audienceId,
      updateAudienceDto
    );
  }

  @Delete(":audienceId/:audienceUserId")
  deleteUserFromAudience(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("audienceId") audienceId: string,
    @Param("audienceUserId") audienceUserId: string
  ) {
    return this.audienceService.deleteUserFromAudience(
      req.appId,
      audienceId,
      audienceUserId
    );
  }

  @Delete(":audienceId")
  deleteAudience(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("audienceId") audienceId: string
  ) {
    return this.audienceService.deleteAudience(req.appId, audienceId);
  }
}