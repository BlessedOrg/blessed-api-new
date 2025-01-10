import { Module } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController, AnalyticsPrivateController } from "./analytics.controller";

@Module({
  controllers: [AnalyticsController, AnalyticsPrivateController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}
