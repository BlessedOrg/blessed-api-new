import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { DevelopersService } from "./developers.service";
import { EmailDto } from "@/common/dto/email.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";

@Controller("private/developers")
export class DevelopersPrivateController {
  constructor(private readonly developersService: DevelopersService) {}

  @RequireDeveloperAuth()
  @Get("me")
  getMyData(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.getMyData(req.developerId);
  }

  @RequireDeveloperAuth()
  @Get("session")
  getSiweSession(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.getSiweSession(req.developerId);
  }

  @Post("loginWithWallet")
  loginWithWallet(@Body() body: {
    message: string;
    signature: string;
    address: string;
    chainId: string;
  }) {
    return this.developersService.loginWithWallet(body);
  }

  @Post("login")
  create(@Body() emailDto: EmailDto) {
    return this.developersService.login(emailDto);
  }

  @RequireDeveloperAuth()
  @Post("logout")
  logout(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.logout(
      req.developerId,
      req.accessTokenVaultKey
    );
  }

  @Post("verify")
  verify(@Body() codeDto: CodeDto) {
    return this.developersService.verify(codeDto);
  }
}
