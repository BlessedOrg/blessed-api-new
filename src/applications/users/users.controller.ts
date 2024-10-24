import { Body, Controller, Post, Req } from "@nestjs/common";
import { UsersService } from "./users.service";
import { LoginDto } from "@/lib/dto/login.dto";
import { CodeDto } from "@/lib/dto/code.dto";
import { RequireApiKey } from "@/lib/decorators/auth.decorator";

@Controller("applications/:app/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
 
}
