import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, Length, Min, MinLength, registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export class CreateTicketDto {
  @MinLength(4, { message: "Name must be at least 4 characters" })
  @IsNotEmpty({ message: "Name is required" })
  name: string;

  @IsOptional()
  description?: string;

  @Length(2, 10, { message: "Symbol must be 2-10 characters" })
  @IsNotEmpty({ message: "Symbol is required" })
  symbol: string;

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