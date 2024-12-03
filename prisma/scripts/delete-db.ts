import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  // Delete records from tables with foreign key dependencies first
  await prisma.order.deleteMany({});
  await prisma.interaction.deleteMany({});
  await prisma.stakeholder.deleteMany({});
  await prisma.audienceUser.deleteMany({});
  await prisma.campaignDistribution.deleteMany({});

  // Delete records from junction tables or tables with multiple foreign keys
  await prisma.eventBouncer.deleteMany({});

  // Delete Entrance records
  // await prisma.entrance.deleteMany({});

  // Delete records from tables that are referenced by others
  await prisma.ticket.deleteMany({});
  await prisma.audience.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.eventLocation.deleteMany({});
  await prisma.eventKey.deleteMany({});

  // Delete records from main tables
  await prisma.event.deleteMany({});

  // Delete remaining tables
  await prisma.emailVerificationCode.deleteMany({});

  console.log('Database cleanup completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });