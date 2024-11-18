import {
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("stripe")
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
    @Headers("stripe-signature") signature: string,
  ) {
    return this.webhooksService.handleWebhook(request, signature);
  }
}
