import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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
    const { name, eventLocation, ...eventData } = updateEventDto;

    const existingEvent = await this.database.event.findUnique({
      where: {
        id: eventId,
        appId
      },
      include: {
        EventLocation: true
      }
    });

    if (!existingEvent) {
      throw new NotFoundException("Event not found");
    }

    const updateData: Partial<UpdateEventDto> = {
      ...eventData
    };

    if (name && name !== existingEvent.name) {
      const slug = slugify(name, {
        lower: true,
        strict: true,
        trim: true
      });

      const isSlugTaken = await this.database.event.findFirst({
        where: {
          slug,
          appId,
          NOT: {
            id: eventId
          }
        }
      });

      if (isSlugTaken) {
        throw new ConflictException("Event with this name already exists");
      }

      updateData.name = name;
      updateData.slug = slug;
    }

    return this.database.$transaction(async (tx) => {
      if (eventLocation) {
        await tx.eventLocation.update({
          where: {
            eventId
          },
          data: eventLocation
        });
      }

      return tx.event.update({
        where: {
          id: eventId,
          appId
        },
        data: updateData,
        include: {
          EventLocation: true
        }
      });
    });
  }

  async create(createEventDto: CreateEventDto, appId: string) {
    const { eventLocation, name, ...eventData } = createEventDto;

    const slug = slugify(name, {
      lower: true,
      strict: true,
      trim: true
    });

    const existingEvent = await this.database.event.findFirst({
      where: {
        slug,
        appId
      }
    });

    if (existingEvent) {
      throw new ConflictException("Event with this name already exists");
    }

    return this.database.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          ...eventData,
          name,
          slug,
          App: {
            connect: { id: appId }
          }
        },
        include: {
          EventLocation: true
        }
      });

      if (eventLocation) {
        await tx.eventLocation.create({
          data: {
            ...eventLocation,
            Event: {
              connect: { id: createdEvent.id }
            }
          }
        });
      }

      return tx.event.findUnique({
        where: { id: createdEvent.id },
        include: { EventLocation: true }
      });
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
        Tickets: true,
        EventLocation: true
      }
    });
  }
}
