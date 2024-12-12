import { forwardRef, HttpException, Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { TicketsDistributeService } from "@/resources/tickets/services/tickets-distribute.service";
import { EmailService } from "@/common/services/email/email.service";
import { TicketsService } from "@/resources/tickets/tickets.service";
import { envVariables } from "@/common/env-variables";
import { contractArtifacts, readContract } from "@/lib/viem";

@Injectable()
export class TicketsDistributeCampaignService {
  constructor(
    private database: DatabaseService,
    private ticketDistributeService: TicketsDistributeService,
    private emailService: EmailService,
    @Inject(
      forwardRef(() => TicketsService)) private ticketsService: TicketsService
  ) {}

  async distribute(
    campaignId: string,
    appId: string,
    req: {
      capsuleTokenVaultKey: string;
      developerWalletAddress: string;
    }
  ) {
    try {
      const campaign = await this.database.campaign.findUnique({
        where: {
          id: campaignId,
          appId
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
          CampaignDistribution: true,
          Tickets: true
        }
      });
      if (campaign?.Tickets?.length === 0) {
        throw new Error("No tickets to distribute");
      }
      if (campaign?.Audiences?.length === 0) {
        throw new Error("No audiences to distribute");
      }

      const ticketsToDistribute = campaign.Tickets;
      const {
        capsuleTokenVaultKey,
        developerWalletAddress
      } = req;
      let allUsersIds = [];
      const distributions = await Promise.all(
        ticketsToDistribute.map(async (ticket) => {
          const users = campaign.Audiences.reduce((acc, audienceUser) => {
            return [...acc, ...audienceUser.AudienceUsers.filter((user) => !acc.some((u) => u.id === user.id))];
          }, []);
          const externalUsers = users
            .filter((user) => !!user?.externalWalletAddress)
            .map((u) => ({
              wallet: u.externalWalletAddress,
              amount: 1,
              id: u.id
            }));
          const formattedUsers = users
            .filter((u) => !u?.externalWalletAddress)
            .map((user) => {
              return {
                audienceUserId: user.id,
                userId: user.User.id,
                walletAddress: user.User.walletAddress,
                smartWalletAddress: user.User.smartWalletAddress,
                amount: 1,
                email: user.User.email
              };
            });
          allUsersIds.push(
            ...formattedUsers.map((user) => user.audienceUserId),
            ...externalUsers.map((user) => user.id)
          );
          const event = await this.database.event.findUnique({
            where: { id: ticket.eventId }
          });
          const allUsersCount = formattedUsers.length + externalUsers.length;
          const initialSupply = await readContract({
            abi: contractArtifacts["tickets"].abi,
            address: ticket.address,
            functionName: "initialSupply"
          });
          const currentSupply = await readContract({
            abi: contractArtifacts["tickets"].abi,
            address: ticket.address,
            functionName: "currentSupply"
          });
          const availableTickets = Number(initialSupply) - Number(currentSupply);
          const missingTickets = allUsersCount - availableTickets;
          const maxSupply = await readContract({
            abi: contractArtifacts["tickets"].abi,
            address: ticket.address,
            functionName: "maxSupply"
          });
          if (missingTickets > Number(maxSupply)) {
            throw new Error("Not enough supply");
          }
          if (!!missingTickets) {
            await this.ticketsService.changeSupply({ additionalSupply: missingTickets }, {
              developerWalletAddress,
              ticketContractAddress: ticket.address,
              capsuleTokenVaultKey
            });
          }
          const { distribution } = await this.ticketDistributeService.distributeTickets(
            formattedUsers,
            ticket.address,
            developerWalletAddress,
            capsuleTokenVaultKey
          );
          const externalDistribution =
            await this.ticketsService.distributeTicketsToExternalWallets(
              externalUsers,
              ticket.address,
              developerWalletAddress,
              capsuleTokenVaultKey
            );
          const emailsToSend = await Promise.all(
            distribution
              .filter((e) => !e?.email?.toLowerCase()?.includes("unknown"))
              .map(async (dist) => {
                const ticketUrls = dist.tokenIds.map(
                  (tokenId) =>
                    `${envVariables.landingPageUrl}/show-ticket?contractId=${ticket.id}&tokenId=${tokenId}&userId=${dist.userId}&eventId=${event.id}`
                );
                return {
                  recipientEmail: dist.email,
                  subject: `Your get the airdrop ticket${dist.tokenIds.length > 0 ? "s" : ""} from ${event.name}!`,
                  template: "./ticketAirdropReceive",
                  context: {
                    eventName: event.name,
                    ticketUrls,
                    imageUrl: event?.logoUrl ?? null,
                    tokenIds: dist.tokenIds
                  }
                };
              })
          );
          await this.emailService.sendBatchEmails(
            emailsToSend,
            envVariables.isDevelopment
          );

          return { distribution, externalDistribution };
        })
      );
      const distributionRecord =
        await this.database.campaignDistribution.create({
          data: {
            Campaign: { connect: { id: campaign.id } },
            AudienceUsers: {
              connect: allUsersIds.map((id) => ({ id }))
            }
          }
        });
      return { distributions: distributions.flat(), distributionRecord };
    } catch (e) {
      throw new HttpException(e.message, 400);
    }
  }

}
