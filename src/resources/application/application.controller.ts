import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApplicationPrivateService, ApplicationService } from "./application.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { CreateApplicationDto } from "@/resources/application/dto/create-application.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@RequireApiKey()
@Controller("application")
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get("owner")
  getAppOwnerData(@Req() req: RequestWithApiKey) {
    return this.applicationService.getAppOwnerData(req.developerId);
  }
  @Get()
  getAppDetails(@Req() req: RequestWithApiKey) {
    return this.applicationService.getAppDetails(req.appId);
  }

  @Get("users")
  getAppUsers(@Req() req: RequestWithApiKey) {
    return this.applicationService.getAppUsers(req.appId);
  }
}

@RequireDeveloperAuth()
@Controller("private/apps")
export class ApplicationPrivateController {
  constructor(private readonly applicationsService: ApplicationPrivateService) {}

  @Post()
  createApplication(
    @Body() createApplicationDto: CreateApplicationDto,
    @Req() req: RequestWithDevAccessToken
  ) {
    const developerId = req.developerId;
    return this.applicationsService.createApplication(createApplicationDto, developerId);
  }

  @UseAppIdInterceptor()
  @Get(":app/users")
  getAppUsers(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.getAppUsers(req.appId);
  }

  @UseAppIdInterceptor()
  @Get(":app")
  getAppDetails(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.getAppDetails(req.appId);
  }

  @Get()
  getAllDeveloperApps(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAllDeveloperApps(developerId);
  }
}
