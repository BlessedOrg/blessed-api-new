import { HttpException, Injectable, UnauthorizedException } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { JwtService } from "@nestjs/jwt";
import { v4 as uuidv4 } from "uuid";
import { createVaultAccessTokenItem, updateVaultItem } from "@/lib/1pwd-vault";

export interface SessionResult {
  refreshToken?: string;
  accessToken?: string;
  walletAddress?: string;
  accountId?: string;
  error?: any;
}

@Injectable()
export class SessionService {
  constructor(
    private database: DatabaseService,
    private jwtService: JwtService
  ) {}

  async checkIsSessionValid(id: string, type: AccountType) {
    let session;
    if (type === "developer") {
      session = await this.database.developerSession.findFirst({
        where: { developerId: id },
        orderBy: { updatedAt: "desc" }
      });
    } else {
      session = await this.database.userSession.findFirst({
        where: { userId: id },
        orderBy: { updatedAt: "desc" }
      });
    }
    const sessionExpired = !session?.expiresAt || new Date(session?.expiresAt).getTime() < new Date().getTime();
    if (sessionExpired) {
      throw new UnauthorizedException("Session expired");
    }

    return true;
  }
  createOrUpdateSession(
    email: string,
    accountType: AccountType,
    appId?: string
  ): Promise<SessionResult> {
    try {
      if (accountType === "developer") {
        return this.updateDeveloperSession(email);
      } else {
        return this.updateUserSession(email, appId);
      }
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  private updateDeveloperSession = async (email: string) => {
    const developer = await this.database.developerAccount.findUnique({
      where: { email }
    });
    if (!developer) {
      throw new Error(`Developer with email ${email} not found`);
    }

    const existingSession = await this.database.developerSession.findFirst({
      where: {
        developerId: developer.id
      }
    });

    if (existingSession?.id) {
      const { accessToken, refreshToken } = this.createSessionTokens({
        developerId: developer?.id,
        capsuleTokenVaultKey: developer.capsuleTokenVaultKey,
        accessTokenVaultKey: developer.accessTokenVaultKey,
        walletAddress: developer.walletAddress
      });
      await this.database.developerSession.update({
        where: {
          id: existingSession.id
        },
        data: {
          developerId: developer.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });
      const vaultItem = await updateVaultItem(
        developer.accessTokenVaultKey,
        [
          {
            op: "replace",
            path: "/fields/accessToken/value",
            value: accessToken
          }
        ],
        "accessToken"
      );
      if (!vaultItem?.id) {
        throw new Error("❌VAULT ITEM NOT UPDATED");
      }
      return {
        accessToken,
        refreshToken,
        developer: {
          walletAddress: developer.walletAddress,
          smartWalletAddress: developer.smartWalletAddress,
          id: developer.id
        },
        message: "Logged in successfully"
      };
    } else {
      const vaultItem = await createVaultAccessTokenItem("none", developer.id);
      //wait for vault to be created
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!vaultItem?.id) {
        throw new Error("❌VAULT ITEM NOT CREATED");
      } else {
        await this.database.developerAccount.update({
          where: { id: developer.id },
          data: {
            accessTokenVaultKey: vaultItem.id
          }
        });
        const { accessToken, refreshToken } = this.createSessionTokens({
          developerId: developer?.id,
          accessTokenVaultKey: vaultItem.id,
          capsuleTokenVaultKey: developer.capsuleTokenVaultKey,
          walletAddress: developer.walletAddress
        });
        await updateVaultItem(
          vaultItem.id,
          [
            {
              op: "replace",
              path: "/fields/accessToken/value",
              value: accessToken
            }
          ],
          "accessToken"
        );
        await this.database.developerSession.create({
          data: {
            developerId: developer.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          }
        });
        return {
          accessToken,
          refreshToken,
          developer: {
            walletAddress: developer.walletAddress,
            id: developer.id
          },
          message: "Logged in successfully"
        };
      }
    }
  };
  private updateUserSession = async (email: string, appId: string) => {
    const user = await this.database.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    const existingSession = await this.database.userSession.findFirst({
      where: {
        userId: user.id
      }
    });

    if (existingSession?.id) {
      const {
        hashedRefreshToken,
        hashedAccessToken,
        accessToken,
        refreshToken
      } = this.createSessionTokens({
        userId: user?.id,
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
        walletAddress: user.walletAddress
      });
      const updatedSession = await this.database.userSession.update({
        where: {
          id: existingSession.id
        },
        data: {
          accessToken: hashedAccessToken,
          refreshToken: hashedRefreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      if (!updatedSession) {
        throw new HttpException("Session not updated, something went wrong ⛑️", 500);
      }
      return {
        accessToken,
        refreshToken,
        walletAddress: user.walletAddress,
        userId: user.id,
        message: "Logged in successfully"
      };
    } else {
      const { accessToken, refreshToken } = this.createSessionTokens({
        userId: user?.id,
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
        walletAddress: user.walletAddress
      });
      await this.database.userSession.create({
        data: {
          userId: user.id,
          appId,
          accessToken,
          refreshToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return {
        accessToken,
        refreshToken,
        walletAddress: user.walletAddress,
        userId: user.id
      };
    }
  };
  private createSessionTokens(payload: any) {
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET!
    });
    const refreshToken = uuidv4();

    // const hashedAccessToken = awaitait bcrypt.hash(accessToken, 10);
    // const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const hashedAccessToken = accessToken;
    const hashedRefreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
      hashedAccessToken,
      hashedRefreshToken
    };
  }
}
