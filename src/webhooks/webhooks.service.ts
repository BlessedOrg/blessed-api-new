import { BadRequestException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { envVariables } from '@/common/env-variables';
import { biconomyMetaTx } from '@/lib/biconomy';
import { PrefixedHexString } from 'ethereumjs-util';
import { contractArtifacts, readContract, writeContract } from '@/lib/viem';
import { DatabaseService } from '@/common/services/database/database.service';

@Injectable()
export class WebhooksService {
  private readonly stripe: Stripe;

  constructor(private database: DatabaseService) {
    this.stripe = new Stripe(envVariables.stripeSecretKey, {
      apiVersion: '2024-10-28.acacia',
    });
  }

  async handleWebhook(request: any, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        request.body as any,
        signature,
        envVariables.stripeWebhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`,
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntentSucceeded = event.data
          .object as Stripe.PaymentIntent;
        await this.handlePaymentIntentSucceeded(paymentIntentSucceeded);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    console.log('event:', paymentIntent);

    try {
      const metadata = paymentIntent.metadata;

      // 0. buy ERC20 with the received fiat for Operator's wallet
      // 1. send crypto equivalent of paid fiat to buyer's smart wallet
      const erc20Address = await readContract(
        metadata.ticketContractAddress,
        contractArtifacts['tickets'].abi,
        'erc20Address',
      );
      console.log('🐥 erc20Address: ', erc20Address);

      const ticketPrice = await readContract(
        metadata.ticketContractAddress,
        contractArtifacts['tickets'].abi,
        'price',
      );
      console.log('🐬 ticketPrice: ', ticketPrice);

      const user = await this.database.user.findUnique({
        where: {
          id: metadata.userId,
        },
        select: {
          capsuleTokenVaultKey: true,
          smartWalletAddress: true,
        },
      });
      console.log('🔥 user: ', user);

      const transfer = await writeContract(
        erc20Address,
        'transfer',
        [user.smartWalletAddress, ticketPrice],
        contractArtifacts['erc20'].abi,
      );
      console.log('🌳 transfer: ', transfer);

      // 2. call `approve` on ticket's contract as buyer's SM
      const approveResult = await biconomyMetaTx({
        contractAddress: erc20Address as PrefixedHexString,
        contractName: 'erc20',
        functionName: 'approve',
        args: [metadata.ticketContractAddress, ticketPrice],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
      });
      console.log('✅ approve: ', !!approveResult);

      // 3. call `buy` on ticket's contract as buyer's SM
      const getResult = await biconomyMetaTx({
        contractAddress: metadata.ticketContractAddress as PrefixedHexString,
        contractName: 'tickets',
        functionName: 'get',
        args: [],
        capsuleTokenVaultKey: user.capsuleTokenVaultKey,
      });
      console.log('🎟️ get: ', getResult);
    } catch (error) {
      console.log('🚨 error on /webhooks:', error.message);
    }
  }

  async createCheckoutSession(request: any): Promise<void> {

  }
}
