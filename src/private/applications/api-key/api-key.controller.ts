import { Controller, Get, Req } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { RequireDeveloperAuth } from '@/common/decorators/auth.decorator';
import { UseAppIdInterceptor } from '@/common/decorators/use-app-id.decorator';

@RequireDeveloperAuth()
@Controller('private/apps/:app/api-key')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @UseAppIdInterceptor()
  @Get()
  getApiKey(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.apiKeyService.getApiKey(req.appId, req.developerId);
  }
}
