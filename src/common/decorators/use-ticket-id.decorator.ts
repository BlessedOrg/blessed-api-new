import { UseInterceptors } from "@nestjs/common";
import { TicketIdInterceptor } from "@/common/interceptors/param-protect/ticket-id-interceptor";

export function UseTicketIdInterceptor() {
  return UseInterceptors(TicketIdInterceptor);
}