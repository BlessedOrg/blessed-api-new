import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";
import { EmailService } from "@/common/services/email/email.service";

@Module({
  imports: [ConfigModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, EmailService],
})
export class WebhooksModule {}
