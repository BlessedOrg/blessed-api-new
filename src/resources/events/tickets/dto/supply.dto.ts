import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class SupplyDto {
  @Min(1, { message: "Additional Supply must be a positive number" })
  @IsNumber({}, { message: "Additional Supply must be a number" })
  @IsNotEmpty({ message: "Additional Supply is required" })
  additionalSupply: number;
}