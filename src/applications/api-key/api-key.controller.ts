import { Controller, Get, Req } from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { RequireDeveloperAuth } from "@/lib/decorators/auth.decorator";

@RequireDeveloperAuth()
@Controller("applications/:app/api-key")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get()
  getApiKey(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.apiKeyService.getApiKey(req.appId, req.developerId);
  }
}
