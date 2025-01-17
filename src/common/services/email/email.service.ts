import { envVariables } from "@/common/env-variables";
import { DatabaseService } from "@/common/services/database/database.service";
import { MailerService } from "@nestjs-modules/mailer";
import { HttpException, Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class EmailService {
  constructor(
    private database: DatabaseService,
    private readonly mailerService: MailerService
  ) {}

  async sendBatchEmails(emailDataArray: any, isLocalhost: boolean) {
    const emailPromises = emailDataArray.map(
      ({ recipientEmail, subject, template, context }) => {
        const options = {
          from: envVariables.mail.email || "test@blessed.fan",
          to: recipientEmail,
          subject: subject,
          template,
          context,
        };

        return this.mailerService.sendMail(options);
      }
    );
    const sendResults = await Promise.all(emailPromises);
    if (isLocalhost) {
      sendResults.forEach((result, index) => {
        console.log(
          `📨 Email ${index + 1} sent. Preview URL: ${nodemailer.getTestMessageUrl(result)}`
        );
      });
    }

    return sendResults;
  }

  async sendVerificationCodeEmail(to: string) {
    try {
      const otpCode = await this.generateOTP(to);
      const result = await this.mailerService.sendMail({
        from: envVariables.mail.email || "helper@blessed.fan",
        to,
        subject: "Your One-Time Password for Blessed.fan",
        template: "./verificationCode",
        context: {
          otp: otpCode,
        },
      });
      this.logEmailinDevelopment(result);
      return { success: true, message: "Verification code sent successfully" };
    } catch (error) {
      throw new Error(error);
    }
  }

  async sendTicketPurchasedEmail(
    to: string,
    imageUrl: string,
    eventName: string,
    ticketUrl: string
  ) {
    try {
      const result = await this.mailerService.sendMail({
        from: envVariables.mail.email || "test@blessed.fan",
        to,
        subject: `Your Ticket for ${eventName}`,
        template: "./ticketPurchase",
        context: {
          imageUrl,
          eventName,
          ticketUrl,
        },
      });
      this.logEmailinDevelopment(result);
      return { message: "Ticket purchase confirmation sent successfully" };
    } catch (error) {
      throw new Error(error);
    }
  }

  async sendRevenueNotificationEmail(
    to: string,
    sharesPercentage: number,
    destination: {
      appName: string;
      eventName?: string;
      ticketName?: string;
    }
  ) {
    try {
      const destinationString =
        destination?.ticketName ||
        destination?.eventName ||
        destination?.appName;
      const result = await this.mailerService.sendMail({
        from: envVariables.mail.email || "test@blessed.fan",
        to,
        subject: `You have been added to the revenue list for ${destinationString}`,
        template: "./revenueNotification",
        context: {
          destinationString,
          sharesPercentage,
          now: new Date().getTime(),
        },
      });
      this.logEmailinDevelopment(result);
      return { message: "Revenue notification sent successfully" };
    } catch (error) {
      throw new Error(error);
    }
  }

  async verifyEmailVerificationCode(code: string) {
    const existingCodeData =
      await this.database.emailVerificationCode.findFirst({
        where: {
          code,
        },
      });
    if (!existingCodeData) {
      throw new HttpException("Invalid code", 400);
    }

    if (new Date(existingCodeData.expiresAt).getTime() < new Date().getTime()) {
      await this.database.emailVerificationCode.delete({
        where: {
          id: existingCodeData.id,
        },
      });
      throw new HttpException("Code expired", 400);
    }

    await this.database.emailVerificationCode.delete({
      where: {
        id: existingCodeData.id,
      },
    });

    return {
      email: existingCodeData.email,
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
        expiresAt: new Date(Date.now() + 3 * 60 * 1000),
      },
    });
    if (newCode) {
      console.log(`📧 Created verification code record:`, newCode.code);
    }
    return otp;
  }

  logEmailinDevelopment(result: any) {
    if (envVariables.isDevelopment) {
      console.log("📨 Preview URL:", nodemailer.getTestMessageUrl(result));
    }
  }
}
