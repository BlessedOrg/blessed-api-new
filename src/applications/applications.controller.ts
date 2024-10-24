import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { RequireDeveloperAuth } from "@/lib/decorators/auth.decorator";

@RequireDeveloperAuth()
@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto, @Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.create(createApplicationDto, developerId);
  }

  @Get()
  getAll(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAll(developerId);
  }
}
