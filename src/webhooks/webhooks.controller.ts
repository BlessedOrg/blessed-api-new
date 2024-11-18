import { Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from "@nestjs/common";
import { Request } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("stripe")
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.webhooksService.handleWebhook(request, signature);
  }
}
