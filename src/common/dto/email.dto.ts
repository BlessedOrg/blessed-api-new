import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class EmailDto {
  @MaxLength(255, { message: "Email is too long (max 255 characters)" })
  @IsEmail({}, { message: "Invalid email format" })
  @IsString({ message: "Email must be a string" })
  @IsNotEmpty({ message: "Email address is required" })
  email: string;
}
