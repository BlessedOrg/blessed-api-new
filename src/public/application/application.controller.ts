import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApplicationPrivateService, ApplicationService } from "./application.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { CreateApplicationDto } from "@/public/application/dto/create-application.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@RequireApiKey()
@Controller("application")
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get("owner")
  getOwner(@Req() req: RequestWithApiKey) {
    return this.applicationService.getOwner(req.developerId);
  }
  @Get()
  getDetails(@Req() req: RequestWithApiKey) {
    return this.applicationService.getDetails(req.appId);
  }

  @Get("users")
  users(@Req() req: RequestWithApiKey) {
    return this.applicationService.users(req.appId);
  }
}

@RequireDeveloperAuth()
@Controller("private/apps")
export class ApplicationPrivateController {
  constructor(private readonly applicationsService: ApplicationPrivateService) {}

  @Post()
  create(
    @Body() createApplicationDto: CreateApplicationDto,
    @Req() req: RequestWithDevAccessToken
  ) {
    const developerId = req.developerId;
    return this.applicationsService.create(createApplicationDto, developerId);
  }

  @UseAppIdInterceptor()
  @Get(":app/users")
  allUsers(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.allUsers(req.appId);
  }

  @UseAppIdInterceptor()
  @Get(":app")
  details(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.details(req.appId);
  }

  @Get()
  all(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAll(developerId);
  }
}
