import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { EmailService } from "@/common/services/email/email.service";
import { StakeholderDto } from "@/routes/stakeholders/dto/stakeholder-dto";
import { Injectable } from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { UsersService } from "../users/users.service";

@Injectable()
export class StakeholdersService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService,
    private emailService: EmailService
  ) {}

  async createStakeholder(
    stakeholders: StakeholderDto[],
    relations: {
      appId: string;
      eventId?: string;
      ticketId?: string;
    }
  ) {
    try {
      const { appId } = relations;
      const stakeholdersAccounts =
        await this.usersService.createManyUserAccounts(
          { users: stakeholders.map((sh) => ({ email: sh.email })) },
          appId
        );

      const stakeholdersWithUserData = stakeholders.map((sh) => {
        const user =
          stakeholdersAccounts.users.find((user) => user.email === sh.email) ||
          {};
        return {
          ...sh,
          ...user
        };
      }) as {
        id: string;
        email: string;
        walletAddress: string;
        smartWalletAddress: string;
        feePercentage: number;
        paymentMethods: PaymentMethod[];
      }[];

      await this.database.stakeholder.createMany({
        data: stakeholdersWithUserData.map((sh) => ({
          walletAddress: sh.walletAddress,
          feePercentage: sh.feePercentage,
          userId: sh.id,
          paymentMethods: sh.paymentMethods,
          ...relations
        }))
      });

      return { success: true };
    } catch (error) {
      throw new CustomHttpException(error);
    }
  }

  async togglePaymentMethod(
    paymentMethod: PaymentMethod[],
    relations: {
      appId: string;
      eventId?: string;
      ticketId?: string;
    }
  ) {
    try {
      await this.database.stakeholder.updateMany({
        where: relations,
        data: {
          paymentMethods: paymentMethod
        }
      });

      return { success: true };
    } catch (error) {
      throw new CustomHttpException(error);
    }
  }

  async getStakeholders({
    appId,
    eventId,
    ticketId
  }: {
    appId: string;
    eventId?: string;
    ticketId?: string;
  }) {
    return this.database.stakeholder.findMany({
      where: {
				appId,
        eventId: !eventId ? { equals: null } : eventId,
        ticketId: !ticketId ? { equals: null } : ticketId
      },
      include: { User: true }
    });
  }

  async deleteStakeholder(stakeholderId: string, appId: string) {
    return this.database.stakeholder.delete({
      where: { id: stakeholderId, appId }
    });
  }

  async notifyStakeholder(stakeholdersIds: string[], appId: string) {
    try {
      const stakeholders = await this.database.stakeholder.findMany({
        where: {
          id: {
            in: stakeholdersIds
          },
          appId
        },
        include: {
          User: true,
          App: true,
          Event: true,
          Ticket: true
        }
      });

      for (const stakeholder of stakeholders) {
        await this.emailService.sendRevenueNotificationEmail(
          stakeholder.User.email,
          stakeholder.feePercentage,
          {
            appName: stakeholder.App.name,
            eventName: stakeholder.Event?.name,
            ticketName: stakeholder.Ticket?.name
          }
        );
        await this.database.stakeholder.update({
          where: { id: stakeholder.id },
          data: { notifiedAt: new Date() }
        });
      }
      return { success: true };
    } catch (error) {
      throw new CustomHttpException(error);
    }
  }
}
