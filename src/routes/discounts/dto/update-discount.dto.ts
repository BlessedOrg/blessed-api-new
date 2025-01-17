import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountDto } from './create-discount.dto';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {
  @IsString()
  @IsNotEmpty()
  id: string;
}
