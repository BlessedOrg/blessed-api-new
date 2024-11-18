import { IsNotEmpty, Length } from "class-validator";
import { NameDto } from "@/common/dto/name.dto";

export class CreateEntranceDto extends NameDto {
  @Length(42, 42, { message: "Invalid ticket address" })
  @IsNotEmpty({ message: "Ticket address is required" })
  ticketAddress: string;
}