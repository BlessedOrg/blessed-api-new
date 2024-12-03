import { BadRequestException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { envVariables } from "@/common/env-variables";
import { PrefixedHexString } from "ethereumjs-util";
import { contractArtifacts, writeContract } from "@/lib/viem";
import { DatabaseService } from "@/common/services/database/database.service";
import { parseEventLogs } from "viem";
import { getTicketUrl } from "@/utils/getTicketUrl";
import { EmailService } from "@/common/services/email/email.service";
import { OrderStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
import { transformForOnchain, verifyProof } from "@reclaimprotocol/js-sdk";

@Injectable()
export class WebhooksService {
  private readonly stripe: Stripe;

  constructor(
    private database: DatabaseService,
    private emailService: EmailService
  ) {
    this.stripe = stripe;
  }

  async handleStripeWebhook(request: any, signature: string): Promise<HttpStatus> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        request.body as any,
        signature,
        envVariables.stripeWebhookSecret
      );
    } catch (err) {
      console.log("🚨 Error on handleStripeWebhook: ", err.message);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    this.processStripeWebhookEvent(event)
      .catch(error => console.log("🚨 error /webhooks/stripe 1:", error.message));

    return HttpStatus.OK;
  }

  private async processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data.object as Stripe.PaymentIntent;
        const { metadata, id, amount } = paymentIntentSucceeded;
        await this.handlePaymentSucceeded(metadata.ticketId, metadata.userId, id, amount);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async handlePaymentSucceeded(ticketId: string, userId: string, providerId: string, priceCents: number): Promise<void> {
    let orderId: string;
    try {
      const order = await this.database.order.create({
        data: {
          providerId,
          ticketId,
          userId,
          priceCents,
          quantity: 1,
          status: OrderStatus.PENDING
        },
        select: {
          id: true
        }
      });
      orderId = order.id;

      const ticket = await this.database.ticket.findUnique({
        where: {
          id: ticketId
        },
        include: {
          Event: {
            select: {
              name: true,
              id: true
            }
          },
          App: {
            select: {
              slug: true
            }
          }
        }
      });

      const user = await this.database.user.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          email: true,
          capsuleTokenVaultKey: true,
          smartWalletAddress: true
        }
      });

      const client = new ReclaimClient(envVariables.reclaimAppId, envVariables.reclaimAppSecret);

      const publicOptions = {
        method: "GET",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      };
      const privateOptions = {
        headers: { "Authorization": `Bearer ${envVariables.stripeSecretKey}` },
        responseMatches: [
          { "type": "regex", "value": `"ticketAddress": "(?<ticketAddress>.*?)"` },
          { "type": "regex", "value": `"userSmartWalletAddress": "(?<userSmartWalletAddress>.*?)"` }
        ],
        responseRedactions: [
          { "jsonPath": "$.metadata.ticketAddress" },
          { "jsonPath": "$.metadata.userSmartWalletAddress" }
        ]
      };
      const proof = await client.zkFetch(`https://api.stripe.com/v1/payment_intents/${providerId}`, publicOptions, privateOptions as any);

      const { ticketAddress } = proof.extractedParameterValues;

      if (ticketAddress !== ticket.address) {
        throw new BadRequestException("Ticket addresses does not match");
      }

      const isVerified = await verifyProof(proof);

      if (!isVerified) {
        throw new BadRequestException("Proof is not verified");
      }

      const verifyProofAndMintResult= await writeContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticketAddress as PrefixedHexString,
        functionName: "verifyProofAndMint",
        args: [transformForOnchain(proof)],
      });

      const logs = parseEventLogs({
        abi: contractArtifacts["tickets"].abi,
        logs: verifyProofAndMintResult.logs
      });

      const transferSingleEvent = logs.find(
        log => (log as any).eventName === "TransferSingle"
      );

      const tokenId = Number((transferSingleEvent as any).args.id);

      await this.emailService.sendTicketPurchasedEmail(
        user.email,
        "https://avatars.githubusercontent.com/u/164048341",
        ticket.Event.name,
        getTicketUrl(ticket.App.slug, ticket.id, tokenId, user.id, ticket.Event.id)
      );
    } catch (e) {
      console.log("🚨 error on /webhooks/stripe 2:", e);

      if (orderId) {
        await this.database.order.update({
          where: {
            id: orderId
          },
          data: {
            status: OrderStatus.FAILED,
            failReason: e.message
          }
        });
      }
      throw new HttpException(e.message, e.status ?? HttpStatus.BAD_REQUEST);
    }
  }
}
