import { BadRequestException, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { envVariables } from "@/common/env-variables";
import { biconomyMetaTx } from "@/lib/biconomy";
import { PrefixedHexString } from "ethereumjs-util";
import { contractArtifacts, readContract, writeContract } from "@/lib/viem";
import { DatabaseService } from "@/common/services/database/database.service";
import { parseEventLogs } from "viem";

@Injectable()
export class WebhooksService {
  private readonly stripe: Stripe;

  constructor(
    private database: DatabaseService
    // private emailService: EmailService,
  ) {
    this.stripe = new Stripe(envVariables.stripeSecretKey, {
      apiVersion: "2024-10-28.acacia"
    });
  }

  async handleWebhook(request: any, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        request.body as any,
        signature,
        envVariables.stripeWebhookSecret
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`
      );
    }

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntentSucceeded = event.data
          .object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntentSucceeded);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    console.log(paymentIntent);

    try {
      const metadata = paymentIntent.metadata;

      console.log("🔥 metadata: ", metadata);

      const ticket = await this.database.ticket.findUnique({
        where: {
          id: metadata.ticketId
        },
        include: {
          Event: {
            select: {
              name: true
            }
          },
          App: {
            select: {
              slug: true
            }
          }
        }
      });

      // 0. buy ERC20 with the received fiat for Operator's wallet
      // 1. send crypto equivalent of paid fiat to buyer's smart wallet
      const erc20Address = await readContract(
        metadata.ticketContractAddress,
        contractArtifacts["tickets"].abi,
        "erc20Address"
      );
      console.log("🐥 erc20Address: ", erc20Address);

      const ticketPrice = await readContract(
        metadata.ticketContractAddress,
        contractArtifacts["tickets"].abi,
        "price"
      );
      console.log("🐬 ticketPrice: ", ticketPrice);

      const user = await this.database.user.findUnique({
        where: {
          id: metadata.userId
        },
        select: {
          email: true,
          capsuleTokenVaultKey: true,
          smartWalletAddress: true
        }
      });
      console.log("🔥 user: ", user);

      const transfer = await writeContract(
        erc20Address,
        "transfer",
        [user.smartWalletAddress, ticketPrice],
        contractArtifacts["erc20"].abi
      );
      console.log("🌳 transfer: ", transfer);

      // 2. call `approve` on ticket's contract as buyer's SM
      const approveResult = await biconomyMetaTx({
        contractAddress: erc20Address as PrefixedHexString,
        contractName: "erc20",
        functionName: "approve",
        args: [metadata.ticketContractAddress, ticketPrice],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey
      });
      console.log("✅ approve: ", !!approveResult);

      // 3. call `buy` on ticket's contract as buyer's SM
      const getResult = await biconomyMetaTx({
        contractAddress: metadata.ticketContractAddress as PrefixedHexString,
        contractName: "tickets",
        functionName: "get",
        args: [],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey
      });
      console.log("🎟️ get: ", getResult);

      const logs = parseEventLogs({
        abi: contractArtifacts["tickets"].abi,
        logs: getResult.data.transactionReceipt.logs
      });

      const transferSingleEventArgs = logs
        .filter((log) => (log as any) !== "TransferSingle")
        .map((log) => (log as any)?.args);

      console.log("🔥 transferSingleEventArgs: ", transferSingleEventArgs);

      // const url = getTicketUrl(ticket.App.slug, ticket.id)
      //
      // this.emailService.sendTicketPurchasedEmail(user.email, '', ticket.Event.name, );
    } catch (error) {
      console.log("🚨 error on /webhooks:", error.message);
    }
  }
}
