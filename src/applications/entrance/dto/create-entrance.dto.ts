import { IsNotEmpty, Length } from "class-validator";

export class CreateEntranceDto {
  @Length(42, 42, { message: "Invalid ticket address" })
  @IsNotEmpty({ message: "Ticket address is required" })
  ticketAddress: string;
}