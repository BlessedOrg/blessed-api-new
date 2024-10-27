import { Transform, Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from "class-validator";
import { EmailDto } from "@/common/dto/email.dto";

class DistributionItemDto {
  @ValidateNested()
  @Type(() => EmailDto)
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return new EmailDto(value);
    }
    return value;
  }, { toClassOnly: true })
  email!: EmailDto;

  @IsNumber()
  @Min(1, { message: "Amount must be at least 1" })
  amount!: number;
}

export class DistributeDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, { message: "At least one distribution item must be provided" })
  @ValidateNested({ each: true })
  @Type(() => DistributionItemDto)
  distributions!: DistributionItemDto[];
}