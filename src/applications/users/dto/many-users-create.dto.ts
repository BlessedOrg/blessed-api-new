import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { EmailDto } from "@/common/dto/email.dto";
import { Type } from "class-transformer";

export class CreateManyUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  users: EmailDto[];
}