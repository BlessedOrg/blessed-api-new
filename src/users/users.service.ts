import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { EmailService } from "@/common/services/email/email.service";
import { SessionService } from "@/session/session.service";
import { DatabaseService } from "@/common/services/database/database.service";
import { EmailDto } from "@/common/dto/email.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { createCapsuleAccount } from "@/lib/capsule";
import { CreateManyUsersDto } from "@/users/dto/many-users-create.dto";

@Injectable()
export class UsersService {
  constructor(
    private emailService: EmailService,
    private sessionService: SessionService,
    private database: DatabaseService
  ) {}

  async logout(userId: string) {
    await this.database.userSession.updateMany({
      where: {
        userId
      },
      data: {
        expiresAt: new Date()
      }
    });
    return {
      message: "Successfully logged out"
    };
  }
  createMany(users: CreateManyUsersDto, appId: string) {
    return this.createMissingAccounts(users.users.map(user => user.email), appId);
  }
  allUsers(appId: string) {
    return this.database.user.findMany({ where: { Apps: { some: { id: appId } } } });
  }
  async user(appId: string, userId: string) {
    const user = await this.database.user.findUnique({ where: { id: userId, Apps: { some: { id: appId } } } });
    if (!user) {
      throw new HttpException("User does not exist", 404);
    }
    return user;
  }
  login(emailDto: EmailDto) {
    const { email } = emailDto;
    return this.emailService.sendVerificationCodeEmail(email);
  }

  async verify(codeDto: CodeDto, appId: string) {
    try {
      const { code } = codeDto;
      const { email } = await this.emailService.verifyEmailVerificationCode(code);
      const userExists = await this.database.user.findUnique({ where: { email } });
      if (!userExists) {
        return this.createUserAccount(email, appId);
      }
      return this.sessionService.createOrUpdateSession(email, "user", appId);
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  private async createUserAccount(email: string, appId: string) {
    try {
      const createdUserAccount: any = await this.database.user.create({
        data: {
          email,
          Apps: { connect: { id: appId } }
        }
      });
      const { data } = await createCapsuleAccount(createdUserAccount.id, email, "user");

      const { capsuleTokenVaultKey, walletAddress, smartWalletAddress } = data;
      await this.database.user.update({
        where: { id: createdUserAccount.id },
        data: {
          walletAddress,
          capsuleTokenVaultKey,
          smartWalletAddress
        }
      });

      const { accessToken, refreshToken } = await this.sessionService.createOrUpdateSession(email, "user", appId);

      return {
        accessToken,
        refreshToken,
        user: {
          email,
          walletAddress,
          id: createdUserAccount.id
        },
        message: "User account created successfully"
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  };

  private async createMissingAccounts(emails: string[], appId: string) {
    try {
      const existingAccounts = await this.database.user.findMany({
        where: {
          email: {
            in: emails
          }
        },
        include: {
          Apps: {
            where: {
              id: appId
            }
          }
        }
      });

      const accountsToAssign = existingAccounts.filter(account => account.Apps.length === 0);
      const alreadyAssignedAccounts = existingAccounts.filter(account => account.Apps.length > 0);
      const nonExistingEmails = emails.filter(email => !existingAccounts.some(account => account.email === email));

      const result = await this.database.$transaction(async (tx) => {
        await Promise.all(accountsToAssign.map(account =>
          tx.user.update({
            where: { id: account.id },
            data: { Apps: { connect: { id: appId } } }
          })
        ));

        const createNewAccounts = await tx.user.createMany({
          data: nonExistingEmails.map(email => ({ email })),
          skipDuplicates: true
        });

        const newAccounts = await tx.user.findMany({
          where: { email: { in: nonExistingEmails } }
        });

        await Promise.all(newAccounts.map(account =>
          tx.user.update({
            where: { id: account.id },
            data: { Apps: { connect: { id: appId } } }
          })
        ));

        return {
          assignedExisting: accountsToAssign.length,
          createdNew: createNewAccounts.count,
          assignedNew: newAccounts.length,
          newAccounts: newAccounts
        };
      });

      const capsuleAccounts = [];
      for (const account of result.newAccounts) {
        const { data } = await createCapsuleAccount(account.id, account.email, "user");
        if (data) {
          capsuleAccounts.push({
            email: account.email,
            walletAddress: data.walletAddress,
            smartWalletAddress: data.smartWalletAddress,
            capsuleTokenVaultKey: data.capsuleTokenVaultKey
          });
        }
      }

      await this.database.$transaction(
        capsuleAccounts.map(account =>
          this.database.user.update({
            where: { email: account.email },
            data: {
              walletAddress: account.walletAddress,
              smartWalletAddress: account.smartWalletAddress,
              capsuleTokenVaultKey: account.capsuleTokenVaultKey
            }
          })
        )
      );

      const allUsers = await this.database.user.findMany({
        where: { email: { in: emails } },
        select: { id: true, email: true, walletAddress: true, smartWalletAddress: true }
      });

      return {
        assigned: result.assignedExisting,
        created: result.createdNew,
        alreadyAssigned: alreadyAssignedAccounts.length,
        total: emails.length,
        users: allUsers
      };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "An unknown error occurred");
    }
  }
}


