import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class EventLocationDto {
  @IsString()
  @IsOptional()
  street1stLine?: string;

  @IsString()
  @IsOptional()
  street2ndLine?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  locationDetails?: string;

  @IsString()
  @IsOptional()
  continent?: string;

  @IsString()
  @IsOptional()
  stateCode?: string;

  @IsString()
  @IsOptional()
  countryLatitude?: string;

  @IsString()
  @IsOptional()
  countryLongitude?: string;

  @IsString()
  @IsOptional()
  cityLatitude?: string;

  @IsString()
  @IsOptional()
  cityLongitude?: string;

  @IsString()
  @IsOptional()
  countryFlag?: string;
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EventLocationDto)
  eventLocation?: EventLocationDto;

  @IsString()
  @IsOptional()
  timezoneIdentifier?: string;

  @IsISO8601()
  @IsOptional()
  startsAt?: Date;

  @IsISO8601()
  @IsOptional()
  endsAt?: Date;
}