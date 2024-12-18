import { Controller, Get, Query, Req } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { GeneralStatsQueryDto } from "@/resources/analytics/dto/general-stats-query.dto";

@Controller("private/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @RequireDeveloperAuth()
  @Get()
  getGeneralStatistics(@Req() req: RequestWithDevAccessToken, @Query() params: GeneralStatsQueryDto) {
    return this.analyticsService.getAdminStatistics(
      req.developerId,
      params
    );
  }

  @RequireDeveloperAuth()
  @Get("filters")
  getAnalyticsFilter(@Req() req: RequestWithDevAccessToken) {
    return this.analyticsService.getAnalyticsFilter(req.developerId);
  }
}
