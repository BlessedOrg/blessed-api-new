import { Body, Controller, Post } from "@nestjs/common";
import { DevelopersService } from "./developers.service";
import { LoginDto } from "@/common/dto/login.dto";
import { CodeDto } from "@/common/dto/code.dto";

@Controller("developers")
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Post("login")
  create(@Body() loginDto: LoginDto) {
    return this.developersService.login(loginDto);
  }

  @Post("verify")
  verify(@Body() codeDto: CodeDto) {
    return this.developersService.verify(codeDto);
  }
}
