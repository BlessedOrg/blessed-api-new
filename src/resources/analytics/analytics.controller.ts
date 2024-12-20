import { Controller, Get, Query, Req } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { GeneralStatsQueryDto } from "@/resources/analytics/dto/general-stats-query.dto";

@RequireApiKey()
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  getGeneralStatistics(@Req() req: RequestWithApiKey, @Query() params: GeneralStatsQueryDto) {
    return this.analyticsService.getAdminStatistics(
      req.developerId,
      params
    );
  }

  @Get("filters")
  getAnalyticsFilter(@Req() req: RequestWithApiKey) {
    return this.analyticsService.getAnalyticsFilter(req.developerId);
  }
}

@Controller("private/analytics")
export class AnalyticsPrivateController {
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
