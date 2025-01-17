import { EmailDto } from "@/common/dto/email.dto";
import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { biconomyMetaTx } from "@/lib/biconomy";
import { uploadMetadata } from "@/lib/irys";
import { contractArtifacts, deployContract, getExplorerUrl, readContract } from "@/lib/viem";
import { prisma } from "@/prisma/client";
import { CreateEventDto } from "@/routes/events/dto/create-event.dto";
import { UpdateEventDto } from "@/routes/events/dto/update-event.dto";
import { UsersService } from "@/routes/users/users.service";
import { generateEventKey } from "@/utils/eventKey";
import { logoBase64 } from "@/utils/logo_base64";
import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrefixedHexString } from "ethereumjs-util";
import { isEmpty, omit } from "lodash";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import { StakeholdersService } from '../stakeholders/stakeholders.service';

@Injectable()
export class EventsService {
  constructor(
    private eventEmitter: EventEmitter2,
    private database: DatabaseService,
    private usersService: UsersService,
    private stakeholdersService: StakeholdersService
  ) {}

  async create(
    createEventDto: CreateEventDto,
    appId: string,
    developerWalletAddress: PrefixedHexString,
    developerSmartWalletAddress: PrefixedHexString,
    developerId: string
  ) {
    let eventId: string;
    try {
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

      const { metadataUrl, metadataImageUrl, totalWeiPrice } = await uploadMetadata({
        name: createEventDto.name,
        description: createEventDto.description,
        image: createEventDto?.imageUrl || logoBase64
      });

      const initEvent = await prisma.$transaction(async (tx) => {
        const event = await this.database.event.create({
          data: {
            address: `${uuidv4()}-${new Date().getTime()}` as string,
            metadataUrl,
            metadataPayload: {
              name: createEventDto.name,
              description: createEventDto.description,
              image: metadataImageUrl
            },
            name,
            ...omit(eventData, "stakeholders"),
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
        return event;
      });

      this.eventEmitter.emit("interaction.create", {
        method: "uploadMetadata-event",
        gasWeiPrice: totalWeiPrice,
        developerId,
        txHash: "none",
        operatorType: "irys",
        eventId: initEvent.id
      });

      if (createEventDto?.stakeholders && !isEmpty(createEventDto.stakeholders)) {
        await this.stakeholdersService.createStakeholder(createEventDto.stakeholders, {
          appId,
          eventId: initEvent.id
        });
      }

      const args = {
        owner: developerWalletAddress,
        ownerSmartWallet: developerSmartWalletAddress,
        name: createEventDto.name,
        uri: metadataUrl,
        bouncers: createEventDto.bouncers ?? []
      };

      const contract = await deployContract("event", Object.values(args));

      this.eventEmitter.emit("interaction.create", {
        method: "deployEventContract",
        gasWeiPrice: contract.gasWeiPrice,
        developerId,
        eventId: initEvent.id,
        txHash: contract.hash,
        operatorType: "operator"
      });

      return prisma.$transaction(async (tx) => {
        if (eventLocation) {
          await tx.eventLocation.create({
            data: {
              ...eventLocation,
              Event: {
                connect: { id: initEvent.id }
              }
            }
          });
        }
        const updatedEvent = await tx.event.update({
          where: { id: initEvent.id },
          data: {
            address: contract.contractAddr
          },
          include: {
            EventLocation: true,
            Stakeholders: true
          }
        });

        return {
          success: true,
          event: updatedEvent,
          contract: {
            ...contract,
            explorerUrls: {
              contract: getExplorerUrl(contract.contractAddr)
            }
          }
        };
      });

    } catch (error) {
      console.log("🚨 Error on events/create: ", error.message);
      if (eventId) {
        await this.database.event.delete({
          where: {
            id: eventId
          }
        });
      }
      if (error.name === "ConflictException") {
        throw new ConflictException(`Event with this name or slug already exists`);
      } else {
        throw new Error(error.message);
      }
    }
  }

  getAllEventsByDevId(developerId: string) {
    return this.database.event.findMany({
      where: {
        App: {
          developerId
        }
      },
      include: {
        EventLocation: true,
        Tickets: true
      }
    });
  }

  getAllEventsByAppId(appId: string) {
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

  getEventsWithPublicData() {
    return this.database.event.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        createdAt: true,
        address: true,
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
            updatedAt: true
          }
        },
        EventLocation: true
      }
    });
  }

  getEventTicketDetails(eventId: string, ticketId: string) {
    return this.database.event.findUnique({
      where: {
        id: eventId,
        Tickets: {
          some: { id: ticketId }
        }
      }
    });
  }

  getEventDetails(appId: string, eventId: string) {
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

  async letUserIntoEvent(bouncerId: string, decodedCodeData: ITicketQrCodePayload) {
    try {
      const { eventId, tokenId, ticketHolderId, ticketId } = decodedCodeData;
      const event = await this.database.event.findUnique({
        where: { id: eventId },
        include: {
          App: {
            select: {
              developerId: true
            }
          }
        }
      });
      if (!event.address) {
        throw new HttpException(`Wrong parameters. Smart contract entrance not found.`, HttpStatus.BAD_REQUEST);
      }
      const attendee = await this.database.user.findUnique({ where: { id: ticketHolderId } });
      const ticket = await this.database.ticket.findUnique({ where: { id: ticketId } });
      const ticketBouncer = await this.database.user.findUnique({ where: { id: bouncerId } });
      const { capsuleTokenVaultKey } = ticketBouncer;
      const eventContractAddress = event.address as PrefixedHexString;
      const isAlreadyEntered = await readContract({
        abi: contractArtifacts["event"].abi,
        address: eventContractAddress,
        functionName: "hasEntry",
        args: [attendee.smartWalletAddress]
      });

      if (isAlreadyEntered) {
        throw new HttpException("Already entered", HttpStatus.CONFLICT);
      }

      const metaTxResult = await biconomyMetaTx({
        contractName: "event",
        address: eventContractAddress,
        functionName: "entry",
        args: [tokenId, ticket.address, attendee.smartWalletAddress],
        capsuleTokenVaultKey
      });

      this.eventEmitter.emit("interaction.create", {
        method: `entry-event`,
        gasWeiPrice: metaTxResult.data.actualGasCost,
        txHash: metaTxResult.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        ticketId,
        userId: ticketHolderId,
        eventId,
        developerId: event.App.developerId
      });

      return {
        success: true,
        explorerUrls: {
          tx: getExplorerUrl(
            metaTxResult.data.transactionReceipt.transactionHash
          )
        },
        transactionReceipt: metaTxResult.data.transactionReceipt
      };
    } catch (e) {
      console.log(e);
      throw new CustomHttpException(e);
    }
  }

  async getEventEntriesPerTicketId(ticketId: string) {
    try {
      const ticketEntranceRecord = await this.database.ticket.findUnique({
        where: {
          id: ticketId
        },
        include: {
          Event: true
        }
      });
      const entries = await readContract({
        abi: contractArtifacts["event"].abi,
        address: ticketEntranceRecord.Event.address,
        functionName: "getEntries"
      });
      const formattedEntries = [];
      const notFoundAddresses = [];

      for (const entry of entries as any) {
        const user = await this.database.user.findUnique({
          where: {
            smartWalletAddress: entry.wallet?.toLowerCase()
          },
          select: {
            email: true,
            walletAddress: true,
            id: true
          }
        });

        if (user) {
          formattedEntries.push({
            email: user.email,
            smartWalletAddress: entry.wallet.toLowerCase(),
            walletAddress: user.walletAddress,
            entryTimestamp: Number(entry.timestamp),
            ticketId: Number(entry.ticketId),
            id: user.id
          });
        } else {
          notFoundAddresses.push(entry.wallet.toLowerCase());
          formattedEntries.push({
            external: true,
            walletAddress: entry.wallet.toLowerCase(),
            entryTimestamp: Number(entry.timestamp),
            ticketId: Number(entry.ticketId)
          });
        }
      }

      return {
        entries: formattedEntries,
        externalAddresses: notFoundAddresses
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  async addEventBouncer(developerId: string, appId: string, eventId: string, emailDto: EmailDto) {
    try {
      let userAccount = await this.database.user.findUnique({ where: { email: emailDto.email } }) as any;
      if (!userAccount) {
        const createdUsers = await this.usersService.createManyUserAccounts({ users: [emailDto] }, appId);
        userAccount = createdUsers.users[0];
      }
      const developer = await this.database.developer.findUnique({ where: { id: developerId } });
      const event = await this.database.event.findUnique({ where: { id: eventId } });
      const txRes = await biconomyMetaTx({
        contractName: "event",
        address: event.address,
        functionName: "addBouncer",
        args: [userAccount.smartWalletAddress],
        capsuleTokenVaultKey: developer.capsuleTokenVaultKey
      });

      this.eventEmitter.emit("interaction.create", {
        method: `addBouncer-event`,
        gasWeiPrice: txRes.data.actualGasCost,
        txHash: txRes.data.transactionReceipt.transactionHash,
        operatorType: "biconomy",
        developerId,
        eventId
      });

      return this.database.eventBouncer.create({
        data: {
          Event: { connect: { id: eventId } },
          User: { connect: { id: userAccount.id } }
        }
      });
    } catch (e) {
      throw new CustomHttpException(e);
    }
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
