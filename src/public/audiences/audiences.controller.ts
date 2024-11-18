import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AudiencesService } from './audiences.service';
import { RequireApiKey } from '@/common/decorators/auth.decorator';
import { CreateAudienceDto } from '@/public/audiences/dto/create-audience.dto';
import { AssignAudiencesDto } from '@/public/audiences/dto/assign-audiences.dto';

@RequireApiKey()
@Controller('audiences')
export class AudiencesController {
  constructor(private readonly audiencesService: AudiencesService) {}

  @Get()
  all(@Req() req: RequestWithApiKey) {
    return this.audiencesService.all(req.appId);
  }
  @Post()
  create(
    @Req() req: RequestWithApiKey,
    @Body() createAudienceDto: CreateAudienceDto,
  ) {
    return this.audiencesService.create(createAudienceDto, req.appId);
  }

  @Post(':audienceId/assign')
  createOrAssignUsers(
    @Req() req: RequestWithApiKey,
    @Param('audienceId') audienceId: string,
    @Body() updateAudienceDto: AssignAudiencesDto,
  ) {
    return this.audiencesService.createOrAssignUsers(
      req.appId,
      audienceId,
      updateAudienceDto,
    );
  }
}
