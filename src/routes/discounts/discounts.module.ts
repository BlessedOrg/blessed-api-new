import { Module } from '@nestjs/common';
import { DiscountCodesService, DiscountsService } from "./discounts.service";
import { DiscountCodesPrivateController, DiscountsPrivateController } from "./discounts.controller";

@Module({
  controllers: [DiscountsPrivateController, DiscountCodesPrivateController],
  providers: [DiscountsService, DiscountCodesService],
})
export class DiscountsModule {}
