import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { LoginDto } from "@/lib/dto/login.dto";
import { EmailService } from "@/services/email/email.service";
import { CodeDto } from "@/lib/dto/code.dto";
import { SessionService } from "@/session/session.service";
import { DatabaseService } from "@/services/database/database.service";
import { createCapsuleAccount } from "@/lib/capsule";

@Injectable()
export class DevelopersService {
  constructor(
    private emailService: EmailService,
    private sessionService: SessionService,
    private database: DatabaseService
  ) {}
  login(loginDto: LoginDto) {
    const { email } = loginDto;
    return this.emailService.sendVerificationCodeEmail(email);
  }

  async verify(codeDto: CodeDto) {
    try {
      const { code } = codeDto;
      const { email } = await this.emailService.verifyEmailVerificationCode(code);
      const developerExists = await this.database.developerAccount.findUnique({ where: { email } });
      if (!developerExists) {
        return this.createDeveloperAccount(email);
      }
      return this.sessionService.createOrUpdateSession(email, "developer");
    } catch (e) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  private createDeveloperAccount = async (email: string) => {
    const createdDeveloperAccount: any =
      await this.database.developerAccount.create({
        data: {
          email
        }
      });
    try {
      const { data: capsuleData } = await createCapsuleAccount(
        createdDeveloperAccount.id,
        email,
        "developer"
      );
      const { capsuleTokenVaultKey, walletAddress } = capsuleData;
      await this.database.developerAccount.update({
        where: { id: createdDeveloperAccount.id },
        data: {
          walletAddress,
          capsuleTokenVaultKey
        }
      });
      const { accessToken, refreshToken } = await this.sessionService.createOrUpdateSession(email, "developer");

      return {
        accessToken,
        refreshToken,
        developer: {
          email,
          walletAddress,
          id: createdDeveloperAccount.id
        },
        message: "Account created successfully"
      };
    } catch (e) {
      await this.database.developerAccount.delete({
        where: { id: createdDeveloperAccount.id }
      });
      throw new HttpException(e.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  };
}
