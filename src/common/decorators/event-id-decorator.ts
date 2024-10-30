import { UseInterceptors } from "@nestjs/common";
import { EventIdInterceptor } from "@/common/interceptors/event-id-interceptor";

export function UseEventIdInterceptor() {
  return UseInterceptors(EventIdInterceptor);
}