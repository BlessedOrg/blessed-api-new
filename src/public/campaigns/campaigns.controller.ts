import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { CampaignsService } from "./campaigns.service";
import { RequireApiKey } from "@/common/decorators/auth.decorator";
import { CreateCampaignDto } from "@/public/campaigns/dto/create-campaign.dto";

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
