import { Body, Controller, Get, Post, Put, Delete, Req, Param } from "@nestjs/common";
import { ApplicationPrivateService, ApplicationService } from "./application.service";
import { RequireApiKey, RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { CreateApplicationDto } from "@/routes/application/dto/create-application.dto";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { StripeKeysDto } from "@/routes/application/dto/stripe-keys.dto";

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

  @UseAppIdInterceptor()
  @Post(":app/stripe-keys")
  setStripeKeys(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() stripeKeysDto: StripeKeysDto
  ) {
    return this.applicationsService.setStripeKeys(
      req.appId,
      stripeKeysDto.stripeSecretKey,
      stripeKeysDto.stripeWebhookSecret
    );
  }

  @UseAppIdInterceptor()
  @Get(":app/stripe-keys")
  getStripeKeys(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.getStripeKeys(req.appId);
  }

  @UseAppIdInterceptor()
  @Put(":app/stripe-keys")
  updateStripeKeys(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body() stripeKeysDto: StripeKeysDto
  ) {
    return this.applicationsService.updateStripeKeys(
      req.appId,
      stripeKeysDto.stripeSecretKey,
      stripeKeysDto.stripeWebhookSecret
    );
  }

  @UseAppIdInterceptor()
  @Delete(":app/stripe-keys")
  deleteStripeKeys(
    @Req() req: RequestWithDevAccessToken & AppValidate,
  ) {
    return this.applicationsService.deleteStripeKeys(req.appId);
  }
}
