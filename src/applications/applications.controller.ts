import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { CreateApplicationDto } from "./dto/create-application.dto";
import { RequireDeveloperAuth, RequireDeveloperAuthOrApiKey } from "@/common/decorators/auth.decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@Controller("apps")
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @RequireDeveloperAuth()
  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto, @Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.create(createApplicationDto, developerId);
  }

  @RequireDeveloperAuthOrApiKey()
  @UseAppIdInterceptor()
  @Get(":app/users")
  allUsers(@Req() req: RequestWithApiKeyOrDevAccessToken & AppValidate) {
    return this.applicationsService.allUsers(req.appId);
  }

  @RequireDeveloperAuthOrApiKey()
  @UseAppIdInterceptor()
  @Get(":app")
  details(@Req() req: RequestWithApiKeyOrDevAccessToken & AppValidate) {
    return this.applicationsService.details(req.appId);
  }

  @RequireDeveloperAuthOrApiKey()
  @Get()
  all(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAll(developerId);
  }
}
