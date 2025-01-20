import {
	RequireApiKey,
	RequireDeveloperAuth,
} from "@/common/decorators/auth.decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { CreateCampaignDto } from "@/routes/campaigns/dto/create-campaign.dto";
import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { SaveCampaignDto } from "./dto/save-campaign.dto";

@RequireApiKey()
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  getAllCampaigns(@Req() req: RequestWithApiKey) {
    return this.campaignsService.getAllCampaigns(req.appId);
  }

  @Post()
  create(
    @Req() req: RequestWithApiKey,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignsService.create(req.appId, createCampaignDto);
  }

  @Get(":campaign")
  getCampaignById(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string
  ) {
    return this.campaignsService.getCampaignById(req.appId, id);
  }

  @Patch(":campaign/audiences")
  updateCampaignAudiences(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string,
    @Body()
    updateCampaignAudienceDto: {
      audiences: string[];
      audiencesToRemove?: string[];
    }
  ) {
    return this.campaignsService.updateCampaignAudiences(
      req.appId,
      id,
      updateCampaignAudienceDto
    );
  }

  @Post(":campaign/distribute")
  distributeCampaign(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string
  ) {
    return this.campaignsService.distributeCampaignTickets(req.appId, id, req);
  }
}

@RequireDeveloperAuth()
@UseAppIdInterceptor()
@Controller("private/apps/:app/campaigns")
export class CampaignsPrivateController {
  constructor(private campaignService: CampaignsService) {}

  @Get()
  getAllCampaigns(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.campaignService.getAllCampaigns(req.appId);
  }

  @Post()
  create(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignService.create(req.appId, createCampaignDto);
  }

  @Patch(":campaign/name")
  updateCampaignName(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string,
    @Body() updateCampaignNameDto: { name: string }
  ) {
    return this.campaignService.updateCampaignName(
      req.appId,
      id,
      updateCampaignNameDto.name
    );
  }

  @Patch(":campaign/save")
  saveCampaignState(
    @Req() req: RequestWithApiKey,
    @Param("campaign") id: string,
    @Body()
    body: SaveCampaignDto
  ) {
    return this.campaignService.saveCampaignState(req.appId, id, body);
  }

  @Patch(":campaign/audiences")
  updateCampaignAudiences(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string,
    @Body()
    updateCampaignAudienceDto: {
      audiences: string[];
      audiencesToRemove?: string[];
    }
  ) {
    return this.campaignService.updateCampaignAudiences(
      req.appId,
      id,
      updateCampaignAudienceDto
    );
  }

  @Post(":campaign/distribute-tickets")
  distributeCampaignTickets(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string
  ) {
    return this.campaignService.distributeCampaignTickets(req.appId, id, req);
  }

  @Post(":campaign/distribute-rewards")
  distributeCampaignRewards(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaign") id: string
  ) {
    return this.campaignService.distributeCampaignRewards(req.appId, id, req);
  }

  @Delete(":campaignId")
  deleteCampaign(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("campaignId") campaignId: string
  ) {
    return this.campaignService.delete(campaignId, req.appId);
  }
}
