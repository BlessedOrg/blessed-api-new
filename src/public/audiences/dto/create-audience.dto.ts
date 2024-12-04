import { NameDto } from "@/common/dto/name.dto";
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";
import { EmailDto } from "@/common/dto/email.dto";

export class CreateAudiencesDto extends NameDto {
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((email: string) => new EmailDto(email)))
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  @IsOptional()
  emails: EmailDto[];

  @IsArray()
  @IsString({ each: true })
  externalAddresses: string[];

  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}