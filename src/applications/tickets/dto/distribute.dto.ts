import { ArrayMinSize, IsArray, IsNumber, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { EmailDto } from "@/common/dto/email.dto";

class DistributionItem extends EmailDto {
  @IsNumber({}, { message: "Amount must be a number" })
  @Min(1, { message: "Amount must be at least 1" })
  amount!: number;
}

export class DistributeDto {
  @IsArray()
  @ArrayMinSize(1, { message: "At least one distribution is required" })
  @ValidateNested({ each: true })
  @Type(() => DistributionItem)
  distributions!: DistributionItem[];
}