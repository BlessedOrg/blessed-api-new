import { TicketIdInterceptor } from "@/common/interceptors/param-protect/ticket-id-interceptor";
import { applyDecorators, UseInterceptors } from "@nestjs/common";

export function UseTicketIdInterceptor(throwError = true) {
  return applyDecorators(
    UseInterceptors(TicketIdInterceptor({throwError}))
  )
}
