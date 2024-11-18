import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class WebhooksDto {
  @IsString({ message: 'ticketId must be a string' })
  @IsNotEmpty({ message: 'ticketId is required' })
  ticketId: string;

  @IsString({ message: 'userId must be a string' })
  @IsNotEmpty({ message: 'userId is required' })
  userId: string;

  @IsString({ message: 'eventSlug must be a string' })
  @IsNotEmpty({ message: 'eventSlug is required' })
  eventSlug: string;

  @IsOptional()
  @IsString({ message: 'successUrl must be a string' })
  @IsNotEmpty({ message: 'successUrl is required' })
  successUrl: string;

  @IsOptional()
  @IsString({ message: 'cancelUrl must be a string' })
  @IsNotEmpty({ message: 'cancelUrl is required' })
  cancelUrl: string;
}
