import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { EmailService } from "@/services/email/email.service";
import { SessionService } from "@/session/session.service";
import { DatabaseService } from "@/services/database/database.service";
import { LoginDto } from "@/lib/dto/login.dto";
import { CodeDto } from "@/lib/dto/code.dto";
import { createCapsuleAccount } from "@/lib/capsule";

@Injectable()
export class UsersService {
  constructor(
    private emailService: EmailService,
    private sessionService: SessionService,
    private database: DatabaseService
  ) {}

  get() {
    return this.database.app.findMany();
  }
  login(loginDto: LoginDto) {
    const { email } = loginDto;
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

      const { capsuleTokenVaultKey, walletAddress } = data;
      await this.database.user.update({
        where: { id: createdUserAccount.id },
        data: {
          walletAddress,
          capsuleTokenVaultKey
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
}


