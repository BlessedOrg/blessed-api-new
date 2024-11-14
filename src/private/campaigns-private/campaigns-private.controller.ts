import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { CampaignsService } from "@/public/campaigns/campaigns.service";
import { CreateCampaignDto } from "@/public/campaigns/dto/create-campaign.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";

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
