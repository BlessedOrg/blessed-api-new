import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, Max, IsDate, IsUrl } from "class-validator";
import { Type } from "class-transformer";
import { OmitType } from "@nestjs/mapped-types";

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  discountCode?: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(100)
  percentage: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  minOrderValue?: number;

  @IsString()
  @IsOptional()
  prefix?: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  logoUrl: string;

  @IsString()
  @IsOptional()
  locationLatitude?: string;

  @IsString()
  @IsOptional()
  locationLongitude?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  locationUrl?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  validFrom: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  validTo: Date;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @IsBoolean()
  @IsOptional()
  isVoucher?: boolean;

  @IsBoolean()
  @IsOptional()
  uniqueDiscountCodes?: boolean;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  ticketId?: string;
}

export class CreateTemplateDiscountDto extends OmitType(
  CreateDiscountDto, ['eventId', 'ticketId'] as const
) {}

export class CreateDiscountCodeDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  discountId: string;

  @IsBoolean()
  @IsOptional()
  reusable?: boolean;
}
