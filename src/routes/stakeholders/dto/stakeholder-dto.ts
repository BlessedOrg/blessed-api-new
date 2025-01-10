// 🏗️ TODO: remove or restore
// import { IsNotEmpty, IsNumber, IsString, ValidateIf, IsOptional, Validate } from "class-validator";
// import { ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";
//
// @ValidatorConstraint({ name: 'eitherWalletOrStripe', async: false })
// class EitherEmailOrStripeValidator implements ValidatorConstraintInterface {
//   validate(value: any, args: any) {
//     const obj = args.object;
//     return (obj.email !== undefined) !== (obj.stripePartnerId !== undefined);
//   }
//
//   defaultMessage(args: any) {
//     return "Either email or stripePartnerId must be provided, but not both";
//   }
// }
//
// export class StakeholderDto {
//   @IsOptional()
//   @IsString()
//   @ValidateIf(o => o.email !== undefined)
//   email?: string;
//
//   @IsNumber()
//   feePercentage: number;
//
//   @IsOptional()
//   @IsString()
//   walletAddress?: string;
//
//   @IsOptional()
//   @IsString()
//   @ValidateIf(o => o.stripePartnerId !== undefined)
//   stripePartnerId?: string;
//
//   @Validate(EitherEmailOrStripeValidator)
//   eitherWalletOrStripe: any;
// }

import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class StakeholderDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  feePercentage: number;

  @IsString()
  walletAddress: string;
}