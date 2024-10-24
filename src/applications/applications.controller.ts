import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { RequireDeveloperAuth, RequireDeveloperAuthOrApiKey } from "@/lib/decorators/auth.decorator";

@Controller("applications")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @RequireDeveloperAuth()
  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto, @Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.create(createApplicationDto, developerId);
  }

  @RequireDeveloperAuthOrApiKey()
  @Get(":app")
  details(@Req() req: AppValidate) {
    console.log("Application ID: ", req.appId);
    return this.applicationsService.getDetails(req.appId);
  }

  @RequireDeveloperAuth()
  @Get()
  all(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAll(developerId);
  }
}
