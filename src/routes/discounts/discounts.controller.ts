import { Controller, Get, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { DiscountCodesService, DiscountsService } from "./discounts.service";
import { CreateDiscountCodeDto, CreateDiscountDto, CreateTemplateDiscountDto } from "./dto/create-discount.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";

@RequireDeveloperAuth()
@UseAppIdInterceptor()
@UseEventIdInterceptor()
@Controller("private/apps/:app/discounts")
export class DiscountsPrivateController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  create(@Body() createDiscountDto: CreateDiscountDto) {
    return this.discountsService.create(createDiscountDto);
  }

  @Post("template")
  createTemplate(@Body() createTemplateDiscountDto: CreateTemplateDiscountDto) {
    return this.discountsService.create(createTemplateDiscountDto);
  }

  @Get()
  findAll() {
    return this.discountsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.discountsService.findOne(id);
  }

  @Patch()
  update(@Body() updateDiscountDto: UpdateDiscountDto) {
    return this.discountsService.update(updateDiscountDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.discountsService.remove(id);
  }
}

@Controller("private/apps/:app/discounts-codes")
export class DiscountCodesPrivateController {
  constructor(private readonly discountCodesService: DiscountCodesService) {}

  @Post()
  create(@Body() createDiscountCodeDto: CreateDiscountCodeDto) {
    return this.discountCodesService.create(createDiscountCodeDto);
  }

  @Get()
  findAll() {
    return this.discountCodesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.discountCodesService.findOne(id);
  }

  @Post("use")
  use(@Body() updateDiscountCodeDto) {
    return this.discountCodesService.use(updateDiscountCodeDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.discountCodesService.remove(id);
  }
}