import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { EmailDto } from "@/common/dto/email.dto";
import { Transform, Type } from "class-transformer";

export class WhitelistDto {
  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((email: string) => new EmailDto(email)))
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  addEmails: EmailDto[];

  @IsArray()
  @ArrayMinSize(1)
  @Transform(({ value }) => value.map((email: string) => new EmailDto(email)))
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  removeEmails: EmailDto[];
}