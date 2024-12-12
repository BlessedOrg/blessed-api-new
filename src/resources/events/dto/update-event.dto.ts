import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUrl, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { EventLocationDto } from "@/resources/events/dto/create-event.dto";

export class UpdateEventDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  slug?: string;

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