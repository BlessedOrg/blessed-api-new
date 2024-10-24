import { prisma } from '@/prisma/client';

export const getAppBySlugOrId = async (slugOrId: string) => {
  return prisma.app.findFirst({
    where: {
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
    include: {
      DeveloperAccount: {
        select: {
          walletAddress: true,
        },
      },
    },
  });
};
