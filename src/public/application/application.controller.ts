import { Controller, Get, Req } from "@nestjs/common";
import { ApplicationService } from "./application.service";
import { RequireApiKey } from "@/common/decorators/auth.decorator";

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
