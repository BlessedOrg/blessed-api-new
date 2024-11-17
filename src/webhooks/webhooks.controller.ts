import { Controller, Headers, Post, Req, Res, RawBodyRequest, Get, Body } from "@nestjs/common";
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { RequireApiKey } from "@/common/decorators/auth.decorator";
import Stripe from "stripe";
import { EmailDto } from "@/common/dto/email.dto";
import { WebhooksDto } from "@/webhooks/webhooks.dto";
import { DatabaseService } from "@/common/services/database/database.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService, private database: DatabaseService) {}

  @Post()
  async handleWebhook(@Req() request: RawBodyRequest<Request>, @Res() response: Response, @Headers('stripe-signature') signature: string) {
    try {
      await this.webhooksService.handleWebhook(request, signature);
      response.sendStatus(200);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  @RequireApiKey()
  @Post("checkout-session")
  async checkoutSession(
    // @Body() webhooksDto: WebhooksDto
    @Req() req: RequestWithApiKey,
  ) {

    console.log(`💽 elo`)
    console.log("🔮 req: ", req.body)
    // console.log("🔮 webhooksDto: ", webhooksDto)
    // console.log("🔮 req: ", req)
    const webhooksDto = {
      userId:"",
      ticketId: ""
    }


    return;

    console.log("🔮 webhooksDto: ", webhooksDto)
    console.log("🔮 process.env.STRIPE_SECRET_KEY: ", process.env.STRIPE_SECRET_KEY)
    try {
      const user = await this.database.user.findUnique({
        where: { id: webhooksDto.userId },
        select: {
          id: true,
          smartWalletAddress: true
        }
      });

      const ticket = await this.database.smartContract.findUnique({
        where: {
          id: webhooksDto.ticketId
        },
        include: {
          Event: {
            select: {
              name: true,
            }
          }
        }
      });

      console.log("🔮 ticket: ", ticket)

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
        apiVersion: "2024-10-28.acacia"
      });

      console.log(`💽 hello`)

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${ticket.Event.name} ticket`,
                // description: "This cost X USDC, we will convert it for you",
                images: ["https://avatars.githubusercontent.com/u/164048341"],
                metadata: {
                  key1: "value1",
                  key2: "value2"
                }
              },
              unit_amount: 100 * 100 // Stripe expects amount in cents
            },
            quantity: 1
          }
        ],
        mode: "payment",
        // success_url: `${request.headers.get("origin")}/success?session_id={CHECKOUT_SESSION_ID}`,
        // cancel_url: `${request.headers.get("origin")}/cancel`,
        metadata: {
          userSmartWalletAddress: user.smartWalletAddress,
          userId: user.id
        }
      });

      console.log("🔮 session: ", session)

      // return NextResponse.json({ sessionId: session.id });
    } catch (err: any) {
      // return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}