import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { UsersService } from "./users.service";
import { EmailDto } from "@/common/dto/email.dto";
import { CodeDto } from "@/common/dto/code.dto";
import { RequireApiKey, RequireUserAndApiKey, RequireUserAuth } from "@/common/decorators/auth.decorator";
import { CreateManyUsersDto } from "@/routes/users/dto/many-users-create.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequireApiKey()
  @Post()
  createManyUserAccounts(@Body() users: CreateManyUsersDto, @Req() req: RequestWithApiKey) {
    return this.usersService.createManyUserAccounts(users, req.appId);
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
  verify(@Body() codeDto: CodeDto, @Req() req: RequestWithApiKey) {
    const { appId } = req;
    return this.usersService.verify(codeDto, appId);
  }

  @RequireApiKey()
  @Get(":userId")
  getUserDataByAppId(@Req() req: RequestWithApiKey, @Param("userId") userId: string) {
    const { appId } = req;
    return this.usersService.getUserDataByAppId(appId, userId);
  }

  @RequireApiKey()
  @Get()
  getAllUsersByAppId(@Req() req: RequestWithApiKey) {
    const { appId } = req;
    return this.usersService.getAllUsersByAppId(appId);
  }
}

@Controller("private/users")
export class UsersPrivateController {
  constructor(private usersService: UsersService) {}

  @RequireUserAuth()
  @Get("me")
  async getMe(@Req() req: RequestWithUserAccessToken) {
    return await this.usersService.getUserById(req.userId);
  }

  @RequireUserAuth()
  @Get("events-bouncer")
  async getUserEventsBouncer(@Req() req: RequestWithUserAccessToken) {
    return await this.usersService.getUserEventsBouncer(req.userId);
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

