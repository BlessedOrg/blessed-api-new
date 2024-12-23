import { PrismaClient } from "@prisma/client";
import * as fs from "fs";

const prisma = new PrismaClient();

async function exportData() {
  const data = {
    developers: await prisma.developer.findMany({
      include: {
        Apps: true,
        Tickets: true,
        Sessions: true,
        Interactions: true
      }
    }),
    apps: await prisma.app.findMany({
      include: {
        Tickets: true,
        Users: true,
        ApiTokens: true,
        Events: true,
        Campaigns: true,
        Audiences: true,
        Developer: true
      }
    }),
    users: await prisma.user.findMany({
      include: {
        Sessions: true,
        Interactions: true,
        Apps: true,
        Orders: true,
        AudienceUsers: true,
        EventBouncers: true
      }
    }),
    userSessions: await prisma.userSession.findMany({
      include: {
        User: true
      }
    }),
    developerSessions: await prisma.developerSession.findMany({
      include: {
        Developer: true
      }
    }),
    emailVerificationCodes: await prisma.emailVerificationCode.findMany(),
    events: await prisma.event.findMany({
      include: {
        EventLocation: true,
        EventKey: true,
        Interactions: true,
        Tickets: true,
        EventBouncers: true,
        Stakeholders: true,
        App: true
      }
    }),
    apiTokens: await prisma.apiToken.findMany({
      include: {
        App: true
      }
    }),
    campaigns: await prisma.campaign.findMany({
      include: {
        Audiences: true,
        CampaignDistribution: {
          include: {
            AudienceUsers: true
          }
        },
        Tickets: true,
        App: true
      }
    }),
    audiences: await prisma.audience.findMany({
      include: {
        Campaigns: true,
        AudienceUsers: true,
        App: true
      }
    }),
    audienceUsers: await prisma.audienceUser.findMany({
      include: {
        Audiences: true,
        CampaignDistributions: true,
        User: true
      }
    }),
    tickets: await prisma.ticket.findMany({
      include: {
        Orders: true,
        Interactions: true,
        Campaigns: true,
        Stakeholders: true,
        App: true,
        Developer: true,
        Event: true
      }
    }),
    interactions: await prisma.interaction.findMany({
      include: {
        Developer: true,
        User: true,
        Ticket: true,
        Event: true
      }
    })

  };

  fs.writeFileSync("seed-data.json", JSON.stringify(data, null, 2));
  console.log("Data exported to seed-data.json");
}

exportData()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());