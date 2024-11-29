import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { UsersService } from "@/public/users/users.service";
import { RequireUserAuth } from "@/common/decorators/auth.decorator";
import { CodeDto } from "@/common/dto/code.dto";
import { EmailDto } from "@/common/dto/email.dto";

@Controller("private/users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @RequireUserAuth()
  @Get("me")
  async getMe(@Req() req: RequestWithUserAccessToken) {
    return await this.usersService.getUserById(req.userId);
  }

  @RequireUserAuth()
  @Get("events-permissions")
  async getUserEventsPermissions(@Req() req: RequestWithUserAccessToken) {
    return await this.usersService.getUserEventsPermissions(req.userId);
  }

  @Post("login")
  async login(@Body() emailDto: EmailDto) {
    return await this.usersService.login(emailDto);
  }

  @RequireUserAuth()
  @Post("logout")
  async logout(@Req() req: UserAccessTokenJWT) {
    return await this.usersService.logout(req.userId);
  }

  @Post("verify")
  async verify(@Body() codeDto: CodeDto) {
    return await this.usersService.verify(codeDto, "global");
  }
}
