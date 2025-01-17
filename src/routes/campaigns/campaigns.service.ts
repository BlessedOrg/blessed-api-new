import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { EmailService } from "@/common/services/email/email.service";
import { CreateCampaignDto } from "@/routes/campaigns/dto/create-campaign.dto";
import { TicketsService } from "@/routes/tickets/tickets.service";
import { Injectable } from "@nestjs/common";
import { CampaignType } from "@prisma/client";
import { omit } from "lodash";
import slugify from "slugify";
import { SaveCampaignDto } from "./dto/save-campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(
    private database: DatabaseService,
    private ticketsService: TicketsService,
    private emailService: EmailService
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
        Discounts: {
          include: {
            DiscountCodes: true
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

  async saveCampaignState(
    appId: string,
    campaignId: string,
    body: SaveCampaignDto
  ) {
    try {
      return await this.database.$transaction(async (tx) => {
        await tx.campaign.update({
          where: {
            id: campaignId,
            appId
          },
          data: {
            type: body.campaignType,
            isDraft: false
          }
        });

        if (body.campaignType === CampaignType.REWARD) {
          const templates = await tx.discount.findMany({
            where: {
              isTemplate: true,
              appId,
              id: {
                in: body.rewardsIds.map((reward) => reward.rewardId)
              }
            }
          });
          await tx.discount.createMany({
            data: templates.map((template) => ({
              ...omit(template, ["id", "createdAt", "updatedAt"]),
              campaignId,
              appId,
              isTemplate: false,
              templateId: template.id,
              ...(body.rewardsIds.find(
                (reward) => reward.rewardId === template.id
              )?.eventId
                ? {
                    eventId: body.rewardsIds.find(
                      (reward) => reward.rewardId === template.id
                    )?.eventId
                  }
                : {})
            }))
          });

          const createdCampaignRewards = await tx.discount.findMany({
            where: {
              campaignId,
              appId,
              templateId: {
                in: body.rewardsIds.map((reward) => reward.rewardId)
              }
            },
            include: {
              DiscountCodes: true
            }
          });

          for (const reward of createdCampaignRewards) {
            const campaignData = await tx.campaign.findUnique({
              where: {
                id: campaignId
              },
              include: {
                Audiences: {
                  include: {
                    AudienceUsers: true
                  }
                }
              }
            });
            if (reward.uniqueDiscountCodes) {
              await tx.discountCode.createMany({
                data: campaignData.Audiences.flatMap(
                  (audience) => audience.AudienceUsers
                ).map((user, idx) => {
                  return {
                    discountId: reward.id,
                    value:
                      reward.prefix +
                      idx +
                      Math.floor(Math.random() * 1000000).toString(),
                    reusable: false
                  };
                })
              });
            } else {
              const templateDiscountCode = await tx.discountCode.findFirst({
                where: {
                  discountId: reward.templateId
                }
              });
              await tx.discountCode.create({
                data: {
                  discountId: reward.id,
                  value: templateDiscountCode.value,
                  reusable: templateDiscountCode.reusable
                }
              });
            }
          }

          return { success: true };
        }

        if (body.campaignType === CampaignType.TICKET) {
          const assignedTickets = await tx.campaign.update({
            where: {
              id: campaignId,
              appId
            },
            data: {
              Tickets: {
                connect: body.ticketsIds.map((ticket) => ({
                  id: ticket.ticketId
                }))
              }
            }
          });

          return { success: true };
        }
      });
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async updateCampaignDiscounts(
    appId: string,
    campaignId: string,
    body: {
      discounts: string[];
      discountsToRemove?: string[];
    }
  ) {
    try {
      if (body?.discountsToRemove?.length) {
        for (const discountId of body.discountsToRemove) {
          await this.database.discount.update({
            where: {
              id: discountId
            },
            data: {
              Campaign: {
                disconnect: true
              }
            }
          });
        }
      }
      return this.database.discount.updateMany({
        where: {
          id: {
            in: body.discounts
          }
        },
        data: {
          campaignId
        }
      });
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

  async distributeCampaignRewards(appId: string, campaignId: string, req: any) {
    try {
      const campaignData = await this.database.campaign.findUnique({
        where: {
          id: campaignId,
          appId
        },
        include: {
          Discounts: {
            include: {
              Event: true,
              DiscountCodes: true
            }
          },
          Audiences: {
            include: {
              AudienceUsers: {
                include: {
                  User: true
                }
              }
            }
          }
        }
      });

      const usersWithEmail = campaignData.Audiences.flatMap(
        (audience) => audience.AudienceUsers
      ).filter((user) => user?.User?.email);

      const rewards = campaignData.Discounts;
      for (const reward of rewards) {
        if (reward.uniqueDiscountCodes) {
          const mappedUsers = usersWithEmail.map((user, idx) => ({
            userId: user.User.id,
            code: reward.DiscountCodes[idx].value,
            email: user.User.email
          }));

          for (const user of mappedUsers) {
            await this.emailService.sendBatchEmails(
              [
                {
                  recipientEmail: user.email,
                  subject: "Your Discount Code",
									template: "./discountCode",
                  context: {
                    code: user.code,
                    discountName: reward.name,
                    discountType: reward.isVoucher ? "voucher" : "discount",
                    reusable: false,
                    redemptionUrl: reward.locationUrl,
                    eventName: reward.Event?.name,
                    now: new Date().getTime()
                  }
                }
              ],
              false
            );
          }
        } else {
          await this.emailService.sendBatchEmails(
            usersWithEmail.map((user) => ({
              recipientEmail: user.User.email,
              subject: "Your Discount Code",
							template: "./discountCode",
              context: {
                code: reward.DiscountCodes[0].value,
                discountName: reward.name,
                reusable: reward.DiscountCodes[0].reusable,
                redemptionUrl: reward.locationUrl,
                eventName: reward.Event?.name,
                discountType: reward.isVoucher ? "voucher" : "discount",
                now: new Date().getTime()
              }
            })),
            false
          );
        }
      }
      const campaignDistribution =
        await this.database.campaignDistribution.create({
          data: {
            campaignId,
            DiscountCodes: {
              connect: rewards
                .flatMap((reward) => reward.DiscountCodes)
                .map((discountCode) => ({
                  id: discountCode.id
                }))
            },
            AudienceUsers: {
              connect: campaignData.Audiences.flatMap(
                (audience) => audience.AudienceUsers
              ).map((audienceUser) => ({
                id: audienceUser.id
              }))
            }
          },
          include: {
            DiscountCodes: true,
            AudienceUsers: true
          }
        });
      return { success: true, campaignDistribution };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  distributeCampaignTickets(appId: string, campaignId: string, req: any) {
    return this.ticketsService.distributeCampaignTickets(campaignId, appId, {
      developerWalletAddress: req?.developerWalletAddress || req?.walletAddress,
      capsuleTokenVaultKey: req.capsuleTokenVaultKey
    });
  }
}
