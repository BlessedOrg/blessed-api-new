import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";
import { IsValidStakeholder } from "@/public/events/tickets/dto/create-ticket.dto";

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
  @IsArray()
  @IsValidStakeholder({ each: true })
  stakeholders: [string, number][];
}