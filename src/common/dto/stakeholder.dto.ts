import { PaymentMethod } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class StakeholderDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  feePercentage: number;

  @IsString()
  walletAddress: string;

  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  paymentMethods: PaymentMethod[];
}
