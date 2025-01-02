import { AppIdInterceptor } from "@/common/interceptors/param-protect/app-id.interceptor";
import { UseInterceptors } from "@nestjs/common";

export function UseAppIdInterceptor() {
  return UseInterceptors(AppIdInterceptor);
}