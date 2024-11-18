import { IsNotEmpty, IsOptional, IsString, IsUrl } from "class-validator";

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
}