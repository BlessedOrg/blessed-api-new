import { Controller, Get, Req } from "@nestjs/common";
import { ApiKeyService } from "./api-key.service";
import { RequireDeveloperAuth } from "@/lib/decorators/auth.decorator";

@Controller("applications/:app/api-key")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @RequireDeveloperAuth()
  @Get()
  getAPiKey(@Req() req: RequestWithAppValidate) {
    return this.apiKeyService.getApiKey(req.appId);
  }

}
