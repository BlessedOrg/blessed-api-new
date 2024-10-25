import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { DevelopersService } from "./developers.service";
import { LoginDto } from "@/common/dto/login.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";

@Controller("developers")
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @RequireDeveloperAuth()
  @Get("me")
  me(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.getDeveloper(req.developerId);
  }

  @Post("login")
  create(@Body() loginDto: LoginDto) {
    return this.developersService.login(loginDto);
  }

  @RequireDeveloperAuth()
  @Post("logout")
  logout(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.logout(req.developerId, req.capsuleTokenVaultKey);
  }

  @Post("verify")
  verify(@Body() codeDto: CodeDto) {
    return this.developersService.verify(codeDto);
  }
}
