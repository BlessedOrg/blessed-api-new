import { UseInterceptors } from "@nestjs/common";
import { EventIdInterceptor } from "@/common/interceptors/param-protect/event-id-interceptor";

export function UseEventIdInterceptor() {
  return UseInterceptors(EventIdInterceptor);
}