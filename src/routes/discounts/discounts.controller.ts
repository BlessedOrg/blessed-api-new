import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { DiscountCodesService, DiscountsService } from "./discounts.service";
import { CreateDiscountCodeDto, CreateDiscountDto, CreateTemplateDiscountDto } from "./dto/create-discount.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";

@RequireDeveloperAuth()
@UseAppIdInterceptor()
@UseEventIdInterceptor()
@Controller("private/apps/:app/discounts")
export class DiscountsPrivateController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  create(@Body() createDiscountDto: CreateDiscountDto, @Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.discountsService.create(createDiscountDto, req.appId);
  }

  @Post("template")
  createTemplate(@Body() createTemplateDiscountDto: CreateTemplateDiscountDto, @Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.discountsService.create(createTemplateDiscountDto, req.appId);
  }

  @Get()
  findAll(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.discountsService.findAll(req.appId);
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