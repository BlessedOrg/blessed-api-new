import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEventDto } from "@/public/events/dto/create-event.dto";
import slugify from "slugify";
import { UpdateEventDto } from "@/public/events/dto/update-event.dto";
import { deployContract, getExplorerUrl } from "@/lib/viem";
import { PrefixedHexString } from "ethereumjs-util";
import { uploadMetadata } from "@/lib/irys";
import { v4 as uuidv4 } from "uuid";
import { EmailDto } from "@/common/dto/email.dto";
import { UsersService } from "@/public/users/users.service";
import { generateEventKey } from "@/utils/eventKey";
import { isEmpty } from "lodash";
import { isAddress } from "viem";

@Injectable()
export class EventsService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService
  ) {}

  getAllEvents(developerId: string) {
    return this.database.event.findMany({
      where: {
        App: {
          developerId
        }
      },
      include: {
        EventLocation: true,
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
        throw new ConflictException(`Event with name ,,${name}" already exists`);
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

  async transformStakeholders(
    stakeholders: [string, number][],
    appId: string): Promise<{ wallet: PrefixedHexString; feePercentage: number }[]> {
    const stakeholderPromises = stakeholders.map(
      async ([identifier, amount]) => {
        let walletAddress: PrefixedHexString;
        if (isAddress(identifier)) {
          walletAddress = identifier;
        } else {
          const { users } = await this.usersService.createMany(
            { users: [{ email: identifier }] },
            appId
          );
          walletAddress = users[0].smartWalletAddress;
        }

        return {
          wallet: walletAddress,
          feePercentage: amount
        };
      }
    );

    return Promise.all(stakeholderPromises);
  }

  async create(
    createEventDto: CreateEventDto,
    appId: string,
    developerWalletAddress: PrefixedHexString,
    developerSmartWalletAddress: PrefixedHexString
  ) {
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

    const event = await this.database.event.create({
      data: {
        contractAddress: `${uuidv4()}-${new Date().getTime()}`,
        name,
        ...eventData,
        slug,
        App: { connect: { id: appId } }
      }
    });
    await this.database.eventKey.create({
      data: {
        eventId: event.id,
        key: generateEventKey()
      }
    });

    if (createEventDto?.stakeholders && !isEmpty(createEventDto.stakeholders)) {
      const stakeholders = await this.transformStakeholders(
        createEventDto.stakeholders,
        appId
      );

      await this.database.stakeholder.createMany({
        data: stakeholders.map(sh => ({
          walletAddress: sh.wallet,
          feePercentage: sh.feePercentage,
          eventId: event.id
        }))
      });
    }

    const { metadataUrl } = await uploadMetadata({
      name: createEventDto.name,
      description: "",
      image: ""
    });

    const args = {
      owner: developerWalletAddress,
      ownerSmartWallet: developerSmartWalletAddress,
      name: createEventDto.name,
      uri: metadataUrl
    };

    const contract = await deployContract("event", Object.values(args));
    console.log("⛓️ Contract Explorer URL: ", getExplorerUrl(contract.contractAddr));
    await this.database.$transaction(async (tx) => {
      const createdEvent = await tx.event.update({
        where: { id: event.id },
        data: {
          ...eventData,
          contractAddress: contract.contractAddr
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

    const updatedEvent = await this.database.event.update({
      where: {
        id: event.id
      },
      data: {
        contractAddress: contract.contractAddr
      },
      include: {
        Stakeholders: {
          select: {
            walletAddress: true,
            feePercentage: true
          }
        }
      }
    });

    return updatedEvent;
  }

  events(appId: string) {
    return this.database.event.findMany({
      where: {
        appId
      },
      include: {
        Tickets: true,
        EventLocation: true
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
        createdAt: true,
        contractAddress: true,
        deletedAt: true,
        updatedAt: true,
        endsAt: true,
        startsAt: true,
        timezoneIdentifier: true,
        Tickets: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
            createdAt: true,
            metadataUrl: true,
            metadataPayload: true,
            eventId: true,
            updatedAt: true,
            Entrance: {
              select: {
                id: true,
                address: true,
                createdAt: true
              }
            }
          }
        },
        EventLocation: true
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
        EventLocation: true,
        EventBouncers: {
          include: {
            User: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });
  }

  async addEventBouncer(appId: string, eventId: string, emailDto: EmailDto) {
    let userAccount = await this.database.user.findUnique({ where: { email: emailDto.email } }) as any;
    if (!userAccount) {
      const createdUsers = await this.usersService.createMany({ users: [emailDto] }, appId);
      userAccount = createdUsers.users[0];
    }
    return this.database.eventBouncer.create({
      data: {
        Event: { connect: { id: eventId } },
        User: { connect: { id: userAccount.id } }
      }
    });
  }

  async removeEventBouncer(appId: string, eventId: string, emailDto: EmailDto) {
    const bouncer = await this.database.eventBouncer.findFirst({ where: { User: { email: emailDto.email }, eventId } }) as any;
    if (!bouncer) {
      throw new NotFoundException("Bouncer not found");
    }
    return this.database.eventBouncer.delete({
      where: {
        id: bouncer.id
      }
    });
  }
}
