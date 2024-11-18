import { Module } from "@nestjs/common";
import { UsersModule } from "@/public/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [],
  providers: []
})
export class CommonModule {}
