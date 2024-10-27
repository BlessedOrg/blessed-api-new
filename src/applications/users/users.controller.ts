import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { UsersService } from "./users.service";
import { EmailDto } from "@/common/dto/email.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { RequireApiKey, RequireUserAndApiKey } from "@/common/decorators/auth.decorator";
import { CreateManyUsersDto } from "@/applications/users/dto/many-users-create.dto";

@Controller("applications/:app/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequireApiKey()
  @Post()
  createMany(@Body() users: CreateManyUsersDto, @Req() req: RequestWithApiKey & AppValidate) {
    return this.usersService.createMany(users, req.appId);
  }

  @RequireUserAndApiKey()
  @Post("logout")
  logout(@Req() req: RequestWithApiKeyAndUserAccessToken) {
    return this.usersService.logout(req.userId);
  }

  @RequireApiKey()
  @Post("login")
  login(@Body() emailDto: EmailDto) {
    return this.usersService.login(emailDto);
  }

  @RequireApiKey()
  @Post("verify")
  verify(@Body() codeDto: CodeDto, @Req() req: RequestWithAppValidate) {
    const { appId } = req;
    return this.usersService.verify(codeDto, appId);
  }

  @RequireApiKey()
  @Get(":userId")
  user(@Req() req: RequestWithAppValidate, @Param("userId") userId: string) {
    const { appId } = req;
    return this.usersService.user(appId, userId);
  }

  @RequireApiKey()
  @Get()
  allUsers(@Req() req: RequestWithAppValidate) {
    const { appId } = req;
    return this.usersService.allUsers(appId);
  }
}
