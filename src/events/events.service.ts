import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEventDto } from "@/events/dto/create-event.dto";
import slugify from "slugify";

@Injectable()
export class EventsService {
  constructor(private database: DatabaseService) {}

  create(createEventDto: CreateEventDto, appId: string) {
    const slug = slugify(createEventDto.name, {
      lower: true,
      strict: true,
      trim: true
    });
    return this.database.event.create({
      data: {
        ...createEventDto,
        slug,
        App: { connect: { id: appId } }
      }
    });
  }

  events(appId: string) {
    return this.database.event.findMany({
      where: {
        appId
      }
    });
  }

  details(eventId: string) {
    return this.database.event.findUnique({
      where: {
        id: eventId
      }
    });
  }
}
