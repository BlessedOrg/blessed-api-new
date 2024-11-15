import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import * as nodemailer from "nodemailer";
import { EmailService } from "@/common/services/email/email.service";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";
import { join } from "path";
import { envVariables } from "@/common/env-variables";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [],
      useFactory: async () => {
        const isLocalhost = envVariables.isDevelopment;
        const { host, port, pass, email } = envVariables.mail;
        let transport;
        if (isLocalhost) {
          const testAccount = await nodemailer.createTestAccount();
          transport = {
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          };
        } else {
          transport = {
            host,
            port,
            secure: false,
            auth: {
              user: email,
              pass: pass
            }
          };
        }
        return {
          transport,
          template: {
            dir: join(__dirname, "templates"),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true
            }
          }
        };
      },
      inject: []
    })
  ],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
