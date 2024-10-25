import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { EmailDto } from "@/common/dto/email.dto";

export class CreateManyUsersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EmailDto)
  users: EmailDto[];
}