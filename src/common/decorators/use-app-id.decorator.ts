import { UseInterceptors } from "@nestjs/common";
import { AppIdInterceptor } from "@/common/interceptors/param-protect/app-id.interceptor";

export function UseAppIdInterceptor() {
  return UseInterceptors(AppIdInterceptor);
}