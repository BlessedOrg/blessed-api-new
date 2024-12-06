import { HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { EmailDto } from "@/common/dto/email.dto";
import { EmailService } from "@/common/services/email/email.service";
import { CodeDto } from "@/common/dto/code.dto";
import { SessionService } from "@/common/services/session/session.service";
import { DatabaseService } from "@/common/services/database/database.service";
import { createCapsuleAccount } from "@/lib/capsule";
import { updateVaultItem } from "@/lib/1pwd-vault";
import { ethers } from "ethers";

@Injectable()
export class DevelopersService {
  constructor(
    private emailService: EmailService,
    private sessionService: SessionService,
    private database: DatabaseService
  ) {}

  getDeveloper(developerId: string) {
    return this.database.developer.findUnique({ where: { id: developerId } });
  }

  async getSiweSession(developerId: string) {
    const dev = await this.database.developer.findUnique({ where: { id: developerId } });
    return { address: dev.connectedWalletAddress };
  }

  async loginWithWallet(data: {
    message: string;
    signature: string;
    address: string;
    chainId: string;
  }) {
    const { message, signature } = data;
    if (message && signature) {

      const verifyMessageResult = ethers.utils.verifyMessage(
        message,
        signature
      );
      if (verifyMessageResult) {
        const res = await this.database.developer.findUnique({
          where: {
            connectedWalletAddress: verifyMessageResult
          }
        });

        if (res) {
          return this.sessionService.createOrUpdateSession(res.connectedWalletAddress, "developer");
        } else {
          return this.createDeveloperAccount(verifyMessageResult);
        }
      } else {
        throw new UnauthorizedException("Invalid signature");
      }
    } else {
      throw new UnauthorizedException("Invalid payload");
    }
  }

  login(emailDto: EmailDto) {
    const { email } = emailDto;
    return this.emailService.sendVerificationCodeEmail(email);
  }
  async logout(developerId: string, accessTokenVaultKey: string) {
    try {
      await this.database.developerSession.updateMany({
        where: {
          developerId
        },
        data: {
          expiresAt: new Date()
        }
      });

      const deletedToken = await updateVaultItem(
        accessTokenVaultKey,
        [
          {
            op: "replace",
            path: "/fields/accessToken/value",
            value: "none"
          }
        ],
        "accessToken"
      );
      if (deletedToken?.id) {
        return {
          message: "Logged out successfully"
        };
      } else {
        throw new Error("Something went wrong");
      }
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  async verify(codeDto: CodeDto) {
    try {
      const { code } = codeDto;
      const { email } = await this.emailService.verifyEmailVerificationCode(code);
      const developerExists = await this.database.developer.findUnique({ where: { email } });
      if (!developerExists) {
        return this.createDeveloperAccount(email);
      }
      return this.sessionService.createOrUpdateSession(email, "developer");
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  private createDeveloperAccount = async (identifier: string) => {
    const identifierType = identifier.includes("@") ? "email" : "connectedWalletAddress";
    const data = { [identifierType]: identifier };
    const createdDeveloperAccount: any = await this.database.developer.create({ data });
    try {
      const { data: capsuleData } = await createCapsuleAccount(
        createdDeveloperAccount.id,
        identifier,
        "developer"
      );
      const { capsuleTokenVaultKey, walletAddress, smartWalletAddress } = capsuleData;
      await this.database.developer.update({
        where: { id: createdDeveloperAccount.id },
        data: {
          walletAddress,
          capsuleTokenVaultKey,
          smartWalletAddress
        }
      });
      const { accessToken, refreshToken } = await this.sessionService.createOrUpdateSession(identifier, "developer");

      return {
        accessToken,
        refreshToken,
        developer: {
          [identifierType]: identifier,
          walletAddress,
          smartWalletAddress,
          id: createdDeveloperAccount.id
        },
        message: "Account created successfully"
      };
    } catch (e) {
      await this.database.developer.delete({
        where: { id: createdDeveloperAccount.id }
      });
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  };
}
