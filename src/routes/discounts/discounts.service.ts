import { DatabaseService } from "@/common/services/database/database.service";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { omit } from "lodash";
import {
	CreateDiscountCodeDto,
	CreateDiscountDto
} from "./dto/create-discount.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";

@Injectable()
export class DiscountsService {
  constructor(private database: DatabaseService) {}

  async create(createDiscountDto: CreateDiscountDto, appId: string) {
    console.log(createDiscountDto);
    return this.database.discount.create({
      data: {
        ...omit(createDiscountDto, "discountCode", "reusable"),
        appId,
        DiscountCodes:
          !!createDiscountDto.discountCode &&
          !createDiscountDto.uniqueDiscountCodes
            ? {
                create: {
                  value: createDiscountDto.discountCode,
                  reusable: createDiscountDto.reusable
                }
              }
            : undefined
      },
      include: {
        DiscountCodes: true
      }
    });
  }

  async findAll(appId: string) {
    return this.database.discount.findMany({
      where: {
        appId,
        isTemplate: true
      }
    });
  }

  async findOne(id: string) {
    return this.database.discount.findUnique({
      where: { id }
    });
  }

  async update(updateDiscountDto: UpdateDiscountDto) {
    const { id, ...updateData } = updateDiscountDto;
    return this.database.discount.update({
      where: { id },
      data: updateData
    });
  }

  async remove(id: string) {
    return this.database.discount.delete({
      where: { id }
    });
  }
}

@Injectable()
export class DiscountCodesService {
  constructor(private database: DatabaseService) {}

  async generate(prefix: string, discountId: string) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const codeLength = 8;
    let code = prefix ? prefix + "-" : "";

    for (let i = 0; i < codeLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }

    code = code.toUpperCase();

    const existingCode = await this.database.discountCode.findUnique({
      where: {
        value_discountId: {
          value: code,
          discountId
        }
      }
    });

    if (existingCode) {
      return this.generate(prefix, discountId);
    }

    return code;
  }

  async create(createDiscountDto: CreateDiscountCodeDto) {
    return this.database.discountCode.create({
      data: createDiscountDto
    });
  }

  async findAll() {
    return this.database.discountCode.findMany({
      include: { Discount: true }
    });
  }

  async findOne(id: string) {
    return this.database.discountCode.findUnique({
      where: { id },
      include: { Discount: true }
    });
  }

  async use(id: string) {
    const discountCode = await this.findOne(id);

    if (discountCode.reusable) {
      throw new HttpException(
        "This code is reusable, you cannot perform this action",
        HttpStatus.BAD_REQUEST
      );
    }

    return this.database.discountCode.update({
      where: { id },
      data: {
        used: true
      }
    });
  }

  async remove(id: string) {
    return this.database.discountCode.delete({
      where: { id }
    });
  }
}
