import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, Length, Min, registerDecorator, ValidateNested, ValidationArguments, ValidationOptions } from "class-validator";
import { AirdropEnum } from "@/common/enums.enum";
import { Type } from "class-transformer";
import { NameDto } from "@/common/dto/name.dto";

export class AirdropDto {
  @IsEnum(AirdropEnum, { message: "Invalid airdrop type, available types: [attendees, holders]" })
  type: AirdropEnum;

  @IsNotEmpty({ message: "Event slug is required" })
  @Length(1, 100, { message: "Event slug must be between 1 and 100 characters" })
  eventSlug: string;

  @IsNotEmpty({ message: "Ticket slug is required for holders type" })
  @Length(1, 100, {
    message: "Ticket slug must be between 1 and 100 characters"
  })
  ticketSlug: string;
}

export class SnapshotDto {
  @IsArray({ message: "Airdrop must be an array" })
  @ArrayMinSize(0, { message: "Airdrop array cannot be empty" })
  @ArrayMaxSize(10, {
    message: "Airdrop array cannot contain more than 10 items"
  })
  @ValidateNested({ each: true })
  @Type(() => AirdropDto)
  snapshot: AirdropDto[];
}

export class CreateTicketDto extends NameDto {
  @IsOptional()
  description?: string;

  @Length(2, 10, { message: "Symbol must be 2-10 characters" })
  @IsNotEmpty({ message: "Symbol is required" })
  symbol: string;

  // @IsNotEmpty({ message: "ERC20 Address is required" })
  // erc20Address: string;

  @IsNotEmpty({ message: "Price is required" })
  @IsPositive({ message: "Price must be positive number (can be 0)" })
  price: number;

  @IsLessThanOrEqual("maxSupply", { message: "Initial supply must be less than or equal to max supply" })
  @Min(1, { message: "Initial supply must be a positive number" })
  @IsNumber({}, { message: "Initial supply must be a number" })
  @IsNotEmpty({ message: "Initial supply is required" })
  initialSupply: number;

  @Min(1, { message: "Max supply must be a positive number" })
  @IsNumber({}, { message: "Max supply must be a number" })
  @IsNotEmpty({ message: "Max supply is required" })
  maxSupply: number;

  @IsBoolean({ message: "Transferable must be a boolean value" })
  @IsNotEmpty({ message: "Transferable field is required" })
  transferable: boolean;

  @IsBoolean({ message: "WhitelistOnly must be a boolean value" })
  @IsNotEmpty({ message: "WhitelistOnly field is required" })
  whitelistOnly: boolean;

  @IsOptional()
  @IsOptional()
  imageUrl?: string;
}

function IsLessThanOrEqual(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isLessThanOrEqual",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return typeof value === "number" &&
            typeof relatedValue === "number" &&
            value <= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${propertyName} must be less than or equal to ${relatedPropertyName}`;
        }
      }
    });
  };
}