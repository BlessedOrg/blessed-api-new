import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class EntryDto {
  @Min(1, { message: "Ticket ID must be a positive number" })
  @IsNumber({}, { message: "Ticket ID must be a number" })
  @IsNotEmpty({ message: "Ticket ID is required" })
  ticketId: string;
}