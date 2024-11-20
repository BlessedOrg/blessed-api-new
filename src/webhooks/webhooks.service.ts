import { BadRequestException, HttpStatus, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { envVariables } from "@/common/env-variables";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { contractArtifacts, readContract, writeContract } from "@/lib/viem";
import { DatabaseService } from "@/common/services/database/database.service";
import { parseEventLogs } from "viem";
import { getTicketUrl } from "@/utils/getTicketUrl";
import { EmailService } from "@/common/services/email/email.service";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class WebhooksService {
  private readonly stripe: Stripe;

  constructor(
    private database: DatabaseService,
    private emailService: EmailService,
  ) {
    this.stripe = new Stripe(envVariables.stripeSecretKey, {
      apiVersion: "2024-10-28.acacia",
    });
  }

  async handleStripeWebhook(request: any, signature: string): Promise<HttpStatus> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        request.body as any,
        signature,
        envVariables.stripeWebhookSecret,
      );
    } catch (err) {
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
    let orderId;
    try {
      const order = await this.database.order.create({
        data: {
          providerId,
          ticketId,
          userId,
          priceCents,
          quantity: 1,
          status: OrderStatus.PENDING,
        }
      });
      orderId = order.id;

      const ticket = await this.database.ticket.findUnique({
        where: {
          id: ticketId,
        },
        include: {
          Event: {
            select: {
              name: true,
              id: true,
            },
          },
          App: {
            select: {
              slug: true,
            },
          },
        },
      });

      // 🏗️ TODO: buy ERC20 with the received fiat for Operator's wallet, or create a CRON that will do it?

      const erc20Address = await readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticket.address,
        functionName: "erc20Address"
      });

      const ticketPrice = await readContract({
        abi: contractArtifacts["tickets"].abi,
        address: ticket.address,
        functionName: "price"
      });

      const user = await this.database.user.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          email: true,
          capsuleTokenVaultKey: true,
          smartWalletAddress: true,
        },
      });

      await writeContract({
        abi: contractArtifacts["erc20"].abi,
        address: erc20Address as PrefixedHexString,
        functionName: "transfer",
        args: [user.smartWalletAddress, ticketPrice]
    });

      await biconomyMetaTx({
        abi: contractArtifacts["erc20"].abi,
        address: erc20Address as PrefixedHexString,
        functionName: "approve",
        args: [ticket.address, ticketPrice],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
      });

      const getResult = await biconomyMetaTx({
        abi: contractArtifacts["tickets"].abi,
        address: ticket.address as PrefixedHexString,
        functionName: "get",
        args: [],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
      });

      const logs = parseEventLogs({
        abi: contractArtifacts["tickets"].abi,
        logs: getResult.data.transactionReceipt.logs,
      });

      const transferSingleEventArgs = logs
        .filter((log) => (log as any) !== "TransferSingle")
        .map((log) => (log as any)?.args);

      const tokenId = Number(transferSingleEventArgs[0].id);

      await this.emailService.sendTicketPurchasedEmail(
        user.email,
        "https://avatars.githubusercontent.com/u/164048341",
        ticket.Event.name,
        getTicketUrl(ticket.App.slug, ticket.id, tokenId, user.id, ticket.Event.id),
      );

      console.log(`📨 email with ticket #${tokenId} sent!`)

    } catch (error) {
      console.log("🚨 error on /webhooks/stripe 2:", error.message);
      await this.database.order.update({
        where: {
          id: orderId
        },
        data: {
          status: OrderStatus.FAILED,
          failReason: error.message
        }
      })
    }
  }
}
