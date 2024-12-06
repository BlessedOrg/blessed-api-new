import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, isEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, Length, Min, registerDecorator, ValidateNested, ValidationArguments, ValidationOptions } from "class-validator";
import { AirdropEnum } from "@/common/enums.enum";
import { Type } from "class-transformer";
import { NameDto } from "@/common/dto/name.dto";
import { isAddress } from "viem";

export class AirdropDto {
  @IsEnum(AirdropEnum, { message: "Invalid airdrop type, available types: [attendees, holders]" })
  type: AirdropEnum;

  @IsNotEmpty({ message: "Event id is required" })
  @Length(1, 100, { message: "Event id must be between 1 and 100 characters" })
  eventId: string;

  @IsNotEmpty({ message: "Ticket id is required for holders type" })
  @Length(1, 100, {
    message: "Ticket id must be between 1 and 100 characters"
  })
  ticketId: string;
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
  @IsArray()
  @isEmailOrEthAddress({ each: true })
  stakeholders: [string, number][];

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

export function isEmailOrEthAddress(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isEmailOrEthAddress",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value) || value.length !== 2) {
            return false;
          }
          const [address, percentage] = value;
          const isValidAddress = isEmail(address) || isAddress(address);
          const isValidPercentage = typeof percentage === "number" && percentage >= 1 && percentage <= 10000;
          return isValidAddress && isValidPercentage;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be an array with a valid email or Ethereum address and a number between 1 and 10000`;
        }
      }
    });
  };
}
