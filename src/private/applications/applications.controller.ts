import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { RequireDeveloperAuth } from '@/common/decorators/auth.decorator';
import { UseAppIdInterceptor } from '@/common/decorators/use-app-id.decorator';

@RequireDeveloperAuth()
@Controller('private/apps')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(
    @Body() createApplicationDto: CreateApplicationDto,
    @Req() req: RequestWithDevAccessToken,
  ) {
    const developerId = req.developerId;
    return this.applicationsService.create(createApplicationDto, developerId);
  }

  @UseAppIdInterceptor()
  @Get(':app/users')
  allUsers(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.allUsers(req.appId);
  }

  @UseAppIdInterceptor()
  @Get(':app')
  details(@Req() req: RequestWithDevAccessToken & AppValidate) {
    return this.applicationsService.details(req.appId);
  }

  @Get()
  all(@Req() req: RequestWithDevAccessToken) {
    const developerId = req.developerId;
    return this.applicationsService.getAll(developerId);
  }
}
