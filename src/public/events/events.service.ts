import { HttpException, Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { CreateEventDto } from "@/public/events/dto/create-event.dto";
import slugify from "slugify";
import { UpdateEventDto } from "@/public/events/dto/update-event.dto";
import { deployContract, getExplorerUrl } from "@/lib/viem";
import { PrefixedHexString } from "ethereumjs-util";
import { uploadMetadata } from "@/lib/irys";
import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "lodash";
import { isAddress } from "viem";
import { UsersService } from "@/public/users/users.service";

@Injectable()
export class EventsService {
  constructor(
    private database: DatabaseService,
    private usersService: UsersService,
  ) {}

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

  async transformStakeholders(
    stakeholders: [string, number][],
    appId: string
  ): Promise<{ wallet: PrefixedHexString; feePercentage: number }[]> {
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
    developerSmartWalletAddress: PrefixedHexString,
  ) {
    const slug = slugify(createEventDto.name, {
      lower: true,
      strict: true,
      trim: true
    });
    
    const event = await this.database.event.create({
      data: {
        contractAddress: `${uuidv4()}-${new Date().getTime()}`,
        name: createEventDto.name,
        description: createEventDto.description,
        logoUrl: createEventDto.logoUrl,
        slug,
        App: { connect: { id: appId } }
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
      name: CreateEventDto.name,
      description: "",
      image: ""
    });

    const args = {
      owner: developerWalletAddress,
      ownerSmartWallet: developerSmartWalletAddress,
      name: CreateEventDto.name,
      uri: metadataUrl
    };

    const contract = await deployContract("event", Object.values(args));
    console.log("⛓️ Contract Explorer URL: ", getExplorerUrl(contract.contractAddr));

    const updatedEvent = await this.database.event.update({
      where: {
        id: event.id
      },
      data: {
        contractAddress: contract.contractAddr,
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
    
    return {
      success: true,
      event: updatedEvent,
      contract,
      explorerUrls: {
        contract: getExplorerUrl(contract.contractAddr)
      }
    }
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
