import { MinLength } from "class-validator";

export class CreateApplicationDto {
  @MinLength(3, { message: "Name must be at least 3 characters" })
  name: string;
  description?: string;
  imageUrl?: string;
}
