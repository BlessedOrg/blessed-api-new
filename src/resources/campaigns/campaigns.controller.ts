import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { CreateCampaignDto } from "@/resources/campaigns/dto/create-campaign.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@RequireApiKey()
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  all(@Req() req: RequestWithApiKey) {
    return this.campaignsService.all(req.appId);
  }

  @Post()
  create(
    @Req() req: RequestWithApiKey,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignsService.create(req.appId, createCampaignDto);
  }

  @Get(":campaign")
  getCampaign(@Req() req: RequestWithApiKey, @Param("campaign") id: string) {
    return this.campaignsService.getCampaign(req.appId, id);
  }

  @Patch(":campaign/audiences")
  updateAudiences(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string,
    @Body()
    updateCampaignAudienceDto: {
      audiences: string[];
      audiencesToRemove?: string[];
    }
  ) {
    return this.campaignsService.updateAudiences(
      req.appId,
      id,
      updateCampaignAudienceDto
    );
  }

  @Patch(":campaign/tickets")
  updateTickets(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string,
    @Body()
    updateCampaignTicketsDto: { tickets: string[]; ticketsToRemove?: string[] }
  ) {
    return this.campaignsService.updateTickets(
      req.appId,
      id,
      updateCampaignTicketsDto
    );
  }

  @Post(":campaign/distribute")
  distribute(@Req() req: RequestWithApiKey, @Param("campaign") id: string) {
    return this.campaignsService.distribute(req.appId, id, req);
  }
}

@RequireDeveloperAuth()
@UseAppIdInterceptor()
@Controller("private/apps/:app/campaigns")
export class CampaignsPrivateController {
  constructor(private campaignService: CampaignsService) {}

  @Get()
  allCampaigns(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.campaignService.all(req.appId);
  }

  @Post()
  createCampaign(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignService.create(req.appId, createCampaignDto);
  }

  @Patch(":campaign/name")
  updateName(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string,
    @Body() updateCampaignNameDto: { name: string }
  ) {
    return this.campaignService.updateName(
      req.appId,
      id,
      updateCampaignNameDto.name
    );
  }
  @Patch(":campaign/audiences")
  updateAudiences(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string,
    @Body()
    updateCampaignAudienceDto: {
      audiences: string[];
      audiencesToRemove?: string[];
    }
  ) {
    return this.campaignService.updateAudiences(
      req.appId,
      id,
      updateCampaignAudienceDto
    );
  }

  @Patch(":campaign/tickets")
  updateTickets(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string,
    @Body()
    updateCampaignTicketsDto: { tickets: string[]; ticketsToRemove?: string[] }
  ) {
    return this.campaignService.updateTickets(
      req.appId,
      id,
      updateCampaignTicketsDto
    );
  }
  @Post(":campaign/distribute")
  distribute(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string
  ) {
    return this.campaignService.distribute(req.appId, id, req);
  }
  @Delete(":campaignId")
  deleteCampaign(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaignId") campaignId: string
  ) {
    return this.campaignService.delete(campaignId, req.appId);
  }
}

