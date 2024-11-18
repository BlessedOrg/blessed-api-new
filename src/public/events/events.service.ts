import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEventDto } from "@/public/events/dto/create-event.dto";
import slugify from "slugify";
import { UpdateEventDto } from "@/public/events/dto/update-event.dto";

@Injectable()
export class EventsService {
  constructor(private database: DatabaseService) {}

  getAllEvents(developerId: string) {
    return this.database.event.findMany({
      where: {
        App: {
          developerId
        }
      },
      include: {
        Tickets: {
          include: {
            Entrance: true
          }
        },
        Entrances: true
      }
    });
  }
  async update(appId: string, eventId: string, updateEventDto: UpdateEventDto) {
    if (updateEventDto.name) {
      const slug = slugify(updateEventDto.name, {
        lower: true,
        strict: true,
        trim: true
      });
      updateEventDto["slug"] = slug;
    }

    const isNameExists = await this.database.event.findFirst({
      where: {
        slug: updateEventDto.slug,
        appId,
        NOT: {
          id: eventId
        }
      }
    });
    if (isNameExists) {
      throw new HttpException("Name already exists", 400);
    }
    return this.database.event.update({
      where: {
        id: eventId,
        appId
      },
      data: updateEventDto
    });
  }
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
      },
      include: {
        Tickets: true
      }
    });
  }

  publicEvents() {
    return this.database.event.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        Tickets: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            createdAt: true,
            Entrance: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                createdAt: true
              }
            }
          }
        },
        Entrances: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            createdAt: true
          }
        }
      }
    });
  }

  details(appId: string, eventId: string) {
    return this.database.event.findUnique({
      where: {
        id: eventId,
        appId
      },
      include: {
        Tickets: true
      }
    });
  }
}
