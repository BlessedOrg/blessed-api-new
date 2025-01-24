import { IsString, IsNotEmpty } from 'class-validator';

export class StripeKeysDto {
  @IsString()
  @IsNotEmpty()
  stripeSecretKey: string;

  @IsString()
  @IsNotEmpty()
  stripeWebhookSecret: string;
}
