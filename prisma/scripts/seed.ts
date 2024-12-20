import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function cleanDatabase() {
  // Delete in reverse order of dependencies
  await prisma.order.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.audienceUser.deleteMany();
  await prisma.campaignDistribution.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.eventLocation.deleteMany();
  await prisma.eventKey.deleteMany();
  await prisma.eventBouncer.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.audience.deleteMany();
  await prisma.event.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.developerSession.deleteMany();
  await prisma.emailVerificationCode.deleteMany();
  await prisma.app.deleteMany();
  await prisma.developer.deleteMany();
  await prisma.user.deleteMany();
}

async function seedDatabase() {
  try {
    const seedData = JSON.parse(fs.readFileSync("seed-data.json", "utf-8"));

    console.log("Cleaning database...");
    await cleanDatabase();
    console.log("Database cleaned");

    // Create developers first
    console.log("Creating developers...");
    const developersMap = new Map();
    for (const developer of seedData.developers) {
      const { Apps, Tickets, Sessions, Interactions, ...developerData } = developer;
      const newDeveloper = await prisma.developer.create({
        data: developerData
      });
      developersMap.set(developer.id, newDeveloper);
    }

    // Create users
    console.log("Creating users...");
    const usersMap = new Map();
    for (const user of seedData.users) {
      const { Sessions, Interactions, Apps, Orders, AudienceUsers, EventBouncers, ...userData } = user;
      const newUser = await prisma.user.create({
        data: userData
      });
      usersMap.set(user.id, newUser);
    }

    // Create apps
    console.log("Creating apps...");
    const appsMap = new Map();
    for (const app of seedData.apps) {
      const {
        Tickets,
        Users,
        ApiTokens,
        Events,
        Campaigns,
        Audiences,
        Developer,
        developerId,
        ...appData
      } = app;

      const newApp = await prisma.app.create({
        data: {
          ...appData,
          Developer: {
            connect: { id: developersMap.get(developerId).id }
          }
        }
      });
      appsMap.set(app.id, newApp);

      // Create app-to-user relations
      if (Users && Users.length > 0) {
        await prisma.app.update({
          where: { id: newApp.id },
          data: {
            Users: {
              connect: Users.map(user => ({ id: usersMap.get(user.id).id }))
            }
          }
        });
      }
    }

    // Create user sessions
    console.log("Creating user sessions...");
    for (const session of seedData.userSessions) {
      const { User, userId, ...sessionData } = session;
      await prisma.userSession.create({
        data: {
          ...sessionData,
          User: userId ? {
            connect: { id: usersMap.get(userId).id }
          } : undefined
        }
      });
    }

    // Create developer sessions
    console.log("Creating developer sessions...");
    for (const session of seedData.developerSessions) {
      const { Developer, developerId, ...sessionData } = session;
      await prisma.developerSession.create({
        data: {
          ...sessionData,
          Developer: developerId ? {
            connect: { id: developersMap.get(developerId).id }
          } : undefined
        }
      });
    }

    // Create email verification codes
    console.log("Creating email verification codes...");
    for (const code of seedData.emailVerificationCodes) {
      await prisma.emailVerificationCode.create({
        data: code
      });
    }

    // Create API tokens
    console.log("Creating API tokens...");
    for (const token of seedData.apiTokens) {
      const { App, appId, ...tokenData } = token;
      await prisma.apiToken.create({
        data: {
          ...tokenData,
          App: {
            connect: { id: appsMap.get(appId).id }
          }
        }
      });
    }

    // Create events
    console.log("Creating events...");
    const eventsMap = new Map();
    for (const event of seedData.events) {
      const {
        EventLocation,
        EventKey,
        Interactions,
        Tickets,
        EventBouncers,
        Stakeholders,
        App,
        appId,
        ...eventData
      } = event;

      const newEvent = await prisma.event.create({
        data: {
          ...eventData,
          App: {
            connect: { id: appsMap.get(appId).id }
          }
        }
      });
      eventsMap.set(event.id, newEvent);

      // Create event location if exists
      if (EventLocation) {
        const { eventId, ...locationData } = EventLocation;
        await prisma.eventLocation.create({
          data: {
            ...locationData,
            Event: {
              connect: { id: newEvent.id }
            }
          }
        });
      }

      // Create event key if exists
      if (EventKey) {
        const { eventId, ...keyData } = EventKey;
        await prisma.eventKey.create({
          data: {
            ...keyData,
            Event: {
              connect: { id: newEvent.id }
            }
          }
        });
      }

      // Create event bouncers
      if (EventBouncers && EventBouncers.length > 0) {
        for (const bouncer of EventBouncers) {
          const { User, userId, eventId, ...bouncerData } = bouncer;
          await prisma.eventBouncer.create({
            data: {
              ...bouncerData,
              User: {
                connect: { id: usersMap.get(userId).id }
              },
              Event: {
                connect: { id: newEvent.id }
              }
            }
          });
        }
      }
    }

    // Create tickets
    console.log("Creating tickets...");
    const ticketsMap = new Map();
    for (const ticket of seedData.tickets) {
      const {
        Orders,
        Interactions,
        Campaigns,
        Stakeholders,
        Developer,
        developerId,
        App,
        appId,
        Event,
        eventId,
        ...ticketData
      } = ticket;

      const newTicket = await prisma.ticket.create({
        data: {
          ...ticketData,
          App: {
            connect: { id: appsMap.get(appId).id }
          },
          Event: {
            connect: { id: eventsMap.get(eventId).id }
          },
          ...(developerId && {
            Developer: {
              connect: { id: developersMap.get(developerId).id }
            }
          })
        }
      });
      ticketsMap.set(ticket.id, newTicket);

      // Create stakeholders
      if (Stakeholders && Stakeholders.length > 0) {
        for (const stakeholder of Stakeholders) {
          const { eventId, ticketId, ...stakeholderData } = stakeholder;
          await prisma.stakeholder.create({
            data: {
              ...stakeholderData,
              Event: {
                connect: { id: eventsMap.get(eventId).id }
              },
              Ticket: {
                connect: { id: newTicket.id }
              }
            }
          });
        }
      }
    }

    // Create campaigns and audiences
    console.log("Creating campaigns and audiences...");
    const campaignsMap = new Map();
    const audiencesMap = new Map();

    // First create audiences
    for (const audience of seedData.audiences) {
      const { Campaigns, AudienceUsers, App, appId, ...audienceData } = audience;
      const newAudience = await prisma.audience.create({
        data: {
          ...audienceData,
          App: {
            connect: { id: appsMap.get(appId).id }
          }
        }
      });
      audiencesMap.set(audience.id, newAudience);
    }

    // Then create campaigns
    for (const campaign of seedData.campaigns) {
      const {
        Audiences,
        CampaignDistribution,
        Tickets,
        App,
        appId,
        ...campaignData
      } = campaign;

      const newCampaign = await prisma.campaign.create({
        data: {
          ...campaignData,
          App: {
            connect: { id: appsMap.get(appId).id }
          },
          Audiences: {
            connect: Audiences?.map(audience => ({ id: audiencesMap.get(audience.id).id })) || []
          },
          Tickets: {
            connect: Tickets?.map(ticket => ({ id: ticketsMap.get(ticket.id).id })) || []
          }
        }
      });
      campaignsMap.set(campaign.id, newCampaign);

      // Create campaign distribution if exists
      if (CampaignDistribution) {
        const { campaignId, AudienceUsers, ...distributionData } = CampaignDistribution;
        await prisma.campaignDistribution.create({
          data: {
            ...distributionData,
            Campaign: {
              connect: { id: newCampaign.id }
            }
          }
        });
      }
    }

    // Create audience users and their relationships
    console.log("Creating audience users...");
    for (const audienceUser of seedData.audienceUsers) {
      const {
        Audiences,
        CampaignDistributions,
        User,
        userId,
        ...audienceUserData
      } = audienceUser;

      const newAudienceUser = await prisma.audienceUser.create({
        data: {
          ...audienceUserData,
          User: userId ? {
            connect: { id: usersMap.get(userId).id }
          } : undefined,
          Audiences: {
            connect: Audiences?.map(audience => ({ id: audiencesMap.get(audience.id).id })) || []
          },
          CampaignDistributions: {
            connect: CampaignDistributions?.map(dist => ({ campaignId: campaignsMap.get(dist.campaignId).id })) || []
          }
        }
      });
    }

    console.log("Creating interactions...");
    for (const interaction of seedData.interactions) {
      const {
        Developer,
        developerId,
        User,
        userId,
        Ticket,
        ticketId,
        Event,
        eventId,
        ...interactionData
      } = interaction;

      await prisma.interaction.create({
        data: {
          ...interactionData,
          Developer: {
            connect: { id: developersMap.get(developerId).id }
          },
          ...(userId && {
            User: {
              connect: { id: usersMap.get(userId).id }
            }
          }),
          ...(ticketId && {
            Ticket: {
              connect: { id: ticketsMap.get(ticketId).id }
            }
          }),
          ...(eventId && {
            Event: {
              connect: { id: eventsMap.get(eventId).id }
            }
          })
        }
      });
    }

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

seedDatabase()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

