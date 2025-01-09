import { Controller, Headers, HttpCode, HttpStatus, Post, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() request: RawBodyRequest<Request>, @Headers("stripe-signature") signature: string) {
    return this.webhooksService.handleStripeWebhook(request, signature);
  }
}
