import { Controller, Get, Req } from "@nestjs/common";
import { ApiKeyPrivateService } from "./api-key.service";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";

@RequireDeveloperAuth()
@Controller("private/apps/:app/api-key")
export class ApiKeyPrivateController {
  constructor(private readonly apiKeyService: ApiKeyPrivateService) {}

  @UseAppIdInterceptor()
  @Get()
  getApiKey(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.apiKeyService.getApiKey(req.appId, req.developerId);
  }
}
