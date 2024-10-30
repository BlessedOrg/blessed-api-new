import { UseInterceptors } from "@nestjs/common";
import { TicketIdInterceptor } from "@/common/interceptors/ticket-id-interceptor";

export function UseTicketIdInterceptor() {
  return UseInterceptors(TicketIdInterceptor);
}