import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  constructor(
    private database: DatabaseService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {}
  async sendVerificationCodeEmail(to: string) {
    try {
      const otpCode = await this.generateOTP(to);

      const result = await this.mailerService.sendMail({
        from: this.configService.get("MAIL_EMAIL") || "test@blessed.fan",
        to,
        subject: "Your One-Time Password for Blessed.fan",
        template: "./verificationCode",
        context: {
          otp: otpCode
        }
      });
      if (this.configService.get("NODE_ENV") === "development") {
        console.log("Preview URL:", nodemailer.getTestMessageUrl(result));
      }
      return { message: "Verification code sent successfully" };
    } catch (error) {
      throw new Error(error);
    }
  }

  async verifyEmailVerificationCode(code: string) {
    const existingCodeData =
      await this.database.emailVerificationCode.findFirst({
        where: {
          code
        }
      });
    if (!existingCodeData) {
      throw new HttpException("Invalid code", 400);
    }

    if (new Date(existingCodeData.expiresAt).getTime() < new Date().getTime()) {
      await this.database.emailVerificationCode.delete({
        where: {
          id: existingCodeData.id
        }
      });
      throw new HttpException("Code expired", 400);
    }

    await this.database.emailVerificationCode.delete({
      where: {
        id: existingCodeData.id
      }
    });

    return {
      email: existingCodeData.email
    };
  }

  private async generateOTP(to: string) {
    const digits = "0123456789";
    const otpLength = 5;
    let otp = "";

    for (let i = 1; i <= otpLength; i++) {
      const index = Math.floor(Math.random() * digits.length);
      otp = otp + digits[index];
    }

    const newCode = await this.database.emailVerificationCode.create({
      data: {
        code: otp,
        email: to,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      }
    });
    if (newCode) {
      console.log(`📧 Created verification code record:`, newCode.code);
    }
    return otp;
  }
}
