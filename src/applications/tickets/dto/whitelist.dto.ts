import { ArrayMinSize, IsArray, IsNotEmpty, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";
import { EmailDto } from "@/common/dto/email.dto";

export class WhitelistDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, { message: "At least one email must be provided for adding" })
  @Transform(({ value }) => value.map((email: string) => new EmailDto(email)))
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  addEmails?: EmailDto[];

  @IsNotEmpty()
  @IsArray()
  @Transform(({ value }) => value.map((email: string) => new EmailDto(email)))
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  removeEmails?: EmailDto[];
}