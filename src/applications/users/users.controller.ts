import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { UsersService } from "./users.service";
import { LoginDto } from "@/common/dto/login.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { RequireApiKey, RequireUserAndApiKey } from "@/common/decorators/auth.decorator";

@Controller("applications/:app/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequireUserAndApiKey()
  @Post("logout")
  logout(@Req() req: RequestWithApiKeyAndUserAccessToken) {
    return this.usersService.logout(req.userId);
  }

  @RequireApiKey()
  @Post("login")
  create(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @RequireApiKey()
  @Post("verify")
  verify(@Body() codeDto: CodeDto, @Req() req: RequestWithAppValidate) {
    const { appId } = req;
    return this.usersService.verify(codeDto, appId);
  }

  @RequireApiKey()
  @Get()
  all(@Req() req: RequestWithAppValidate) {
    const { appId } = req;
    return this.usersService.getAllUsers(appId);
  }
}
