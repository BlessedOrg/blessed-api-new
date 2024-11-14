import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

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
}