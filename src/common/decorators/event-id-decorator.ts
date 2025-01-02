import { EventIdInterceptor } from "@/common/interceptors/param-protect/event-id-interceptor";
import { applyDecorators, UseInterceptors } from "@nestjs/common";

export function UseEventIdInterceptor(throwError = true) {
  return applyDecorators(
    UseInterceptors(EventIdInterceptor({throwError}))
  )
}
