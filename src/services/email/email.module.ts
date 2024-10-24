import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from '@/services/email/email.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isLocalhost = configService.get('NODE_ENV') === 'development';
        const { host, port, pass, email } = configService.get('mail');
        let transport;
        if (isLocalhost) {
          const testAccount = await nodemailer.createTestAccount();
          transport = {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          };
        } else {
          transport = {
            host,
            port,
            secure: false,
            auth: {
              user: email,
              pass: pass,
            },
          };
        }
        return {
          transport,
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
