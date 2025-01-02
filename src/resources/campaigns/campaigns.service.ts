import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateCampaignDto } from "@/resources/campaigns/dto/create-campaign.dto";
import { TicketsService } from "@/resources/tickets/tickets.service";
import { Injectable } from "@nestjs/common";
import slugify from "slugify";

@Injectable()
export class CampaignsService {
  constructor(
    private database: DatabaseService,
    private ticketsService: TicketsService
  ) {}
  create(appId: string, createCampaignDto: CreateCampaignDto) {
    const slug = slugify(createCampaignDto.name, {
      lower: true,
      strict: true,
      trim: true
    });
    return this.database.campaign.create({
      data: {
        name: createCampaignDto.name,
        slug, 
        appId
      }
    });
  }

  getAllCampaigns(appId: string) {
    return this.database.campaign.findMany({
      where: {
        appId,
        deletedAt: {
          equals: null
        }
      },
      include: {
        Audiences: {
          include: {
            AudienceUsers: {
              include: {
                User: true
              }
            }
          }
        },
        Tickets: {
          include: {
            Event: true
          }
        },
        CampaignDistribution: {
          include: {
            AudienceUsers: true
          }
        }
      }
    });
  }

  getCampaignById(appId: string, id: string) {
    return this.database.campaign.findUnique({
      where: {
        id,
        appId
      },
      include: {
        Audiences: true,
        Tickets: true,
        CampaignDistribution: true
      }
    });
  }

  async updateCampaignName(appId: string, campaignId: string, name: string) {
    try {
      const slug = slugify(name, {
        lower: true,
        strict: true,
        trim: true
      });
      const campaign = await this.database.campaign.update({
        where: {
          id: campaignId,
          appId
        },
        data: {
          name,
          slug
        }
      });
      return campaign;
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async updateCampaignAudiences(
    appId: string,
    campaignId: string,
    updateCampaignAudienceDto: {
      audiences: string[];
      audiencesToRemove?: string[];
    }
  ) {
    if (updateCampaignAudienceDto?.audiencesToRemove?.length) {
      await this.database.campaign.update({
        where: {
          id: campaignId
        },
        data: {
          Audiences: {
            disconnect: (
              updateCampaignAudienceDto?.audiencesToRemove || []
            ).map((id) => ({ id }))
          }
        }
      });
    }
    return this.database.campaign.update({
      where: {
        id: campaignId,
        appId
      },
      data: {
        appId,
        Audiences: {
          connect: (updateCampaignAudienceDto?.audiences || []).map((id) => ({
            id
          }))
        }
      },
      include: {
        Audiences: true
      }
    });
  }

  async updateCampaignTickets(
    appId: string,
    campaignId: string,
    updateCampaignTicketsDto: { tickets: string[]; ticketsToRemove?: string[] }
  ) {
    if (updateCampaignTicketsDto?.ticketsToRemove?.length) {
      await this.database.campaign.update({
        where: {
          id: campaignId
        },
        data: {
          Tickets: {
            disconnect: (updateCampaignTicketsDto?.ticketsToRemove || []).map(
              (id) => ({ id })
            )
          }
        }
      });
    }
    return this.database.campaign.update({
      where: {
        id: campaignId,
        appId
      },
      data: {
        appId,
        Tickets: {
          connect: (updateCampaignTicketsDto?.tickets || []).map((id) => ({
            id
          }))
        }
      },
      include: {
        Tickets: true
      }
    });
  }

  delete(campaignId: string, appId: string) {
    return this.database.campaign.update({
      where: {
        id: campaignId,
        appId
      },
      data: {
        deletedAt: new Date()
      }
    });
  }

  distributeCampaign(appId: string, campaignId: string, req: any) {
    return this.ticketsService.distributeCampaignTickets(campaignId, appId, {
      developerWalletAddress: req?.developerWalletAddress || req?.walletAddress,
      capsuleTokenVaultKey: req.capsuleTokenVaultKey
    });
  }
}
