import { IsNotEmpty, MinLength } from "class-validator";

export class NameDto {
  @MinLength(4, { message: "Name must be at least 4 characters" })
  @IsNotEmpty({ message: "Name is required" })
  name: string;
}
