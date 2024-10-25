import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CodeDto {
  @Length(5, 5, { message: 'Code must be exactly 5 characters' })
  @IsString({ message: 'Code must be a string' })
  @IsNotEmpty({ message: 'Code is required' })
  code: string;
}
