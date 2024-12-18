import { Body, Controller, Delete, Get, Post, Req } from "@nestjs/common";
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
  @Post("avatar")
  updateAvatarUrl(@Req() req: RequestWithDevAccessToken, @Body() body: { avatarUrl: string }) {
    return this.developersService.updateAvatarUrl(req.developerId, body.avatarUrl);
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

  @RequireDeveloperAuth()
  @Post("add-email")
  addEmail(@Req() req: RequestWithDevAccessToken, @Body() emailDto: EmailDto) {
    return this.developersService.login(emailDto);
  }

  @RequireDeveloperAuth()
  @Post("verify-email")
  verifyEmail(@Req() req: RequestWithDevAccessToken, @Body() codeDto: CodeDto) {
    return this.developersService.verifyEmail(req.developerId, codeDto);
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

  @RequireDeveloperAuth()
  @Delete("account")
  deleteDeveloperAccount(@Req() req: RequestWithDevAccessToken) {
    return this.developersService.deleteAccount(req.developerId);
  }
}
