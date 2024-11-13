import { forwardRef, HttpException, Inject, Injectable } from "@nestjs/common";
import { AirdropDto, SnapshotDto } from "@/public/events/tickets/dto/create-ticket.dto";
import { DatabaseService } from "@/common/services/database/database.service";
import { contractArtifacts, readContract } from "@/lib/viem";
import { EntranceService } from "@/public/events/entrance/entrance.service";
import { Entrance, Ticket } from "@prisma/client";
import { TicketsService } from "@/public/events/tickets/tickets.service";

@Injectable()
export class TicketsSnapshotService {
  constructor(
    private database: DatabaseService,
    private entranceService: EntranceService,
    @Inject(forwardRef(() => TicketsService))
    private ticketsService: TicketsService
  ) {}

  async snapshot(snapshotDto: SnapshotDto) {
    try {
      const { snapshot } = snapshotDto;

      const { tickets, entrances } =
        await this.getTicketsAndEntrances(snapshot);

      const eligibleUsersForTicketHold =
        await this.getEligibleUsersForTicketHold(tickets);

      const eligibleUsersForEntrance =
        await this.getEligibleUsersForEntrances(entrances);

      const eligibleUsersForTicketHoldMap = new Map(
        eligibleUsersForTicketHold.owners.map((user) => [
          user.smartWalletAddress,
          user
        ])
      );
      const eligibleUsersForEntranceMap = new Map(
        eligibleUsersForEntrance.flatMap((result) =>
          result.entries.map((user) => [user.smartWalletAddress, user])
        )
      );
      const eligibleExternalAddressesForTicketHold = new Set(
        eligibleUsersForTicketHold.externalAddresses.map((address) =>
          address.walletAddress.toLowerCase()
        )
      );
      const eligibleExternalAddressesForEntrance = new Set(
        eligibleUsersForEntrance.flatMap((result) =>
          result.externalAddresses.map((address) => address.toLowerCase())
        )
      );

      const isEntranceRequired = entrances.length > 0;
      const isOwnerRequired = tickets.length > 0;
      let eligibleUsers: any[] = [];
      let eligibleExternalAddresses: any[] = [];
      if (isEntranceRequired && isOwnerRequired) {
        const usersWithMeetCriteria = Array.from(
          eligibleUsersForTicketHoldMap.keys()
        ).filter((user) => eligibleUsersForEntranceMap.has(user));
        const externalAddressesWithMeetCriteria = Array.from(
          eligibleExternalAddressesForTicketHold
        )
          .filter((user) => eligibleExternalAddressesForEntrance.has(user))
          .map((i) => ({ walletAddress: i, external: true }));

        eligibleUsers = usersWithMeetCriteria.map((user) =>
          eligibleUsersForTicketHoldMap.get(user)
        );
        eligibleExternalAddresses = externalAddressesWithMeetCriteria;
      } else if (isEntranceRequired && !isOwnerRequired) {
        eligibleUsers = [
          ...eligibleUsersForEntrance.flatMap((result) => result.entries),
          ...Array.from(eligibleExternalAddressesForEntrance)
        ];
        eligibleExternalAddresses = Array.from(
          eligibleExternalAddressesForEntrance
        ).map((i) => ({ walletAddress: i, external: true }));
      } else {
        eligibleUsers = eligibleUsersForTicketHold.owners;
        eligibleExternalAddresses = Array.from(
          eligibleExternalAddressesForTicketHold
        ).map((i) => ({ walletAddress: i, external: true }));
      }
      return {
        eligibleUsers,
        eligibleExternalAddresses,
        all: [...eligibleUsers, ...eligibleExternalAddresses]
      };
    } catch (e) {
      throw new HttpException(e.message, 500);
    }
  }

  private async getTicketsAndEntrances(airdrop: AirdropDto[]) {
    const ticketsAirdrop = airdrop.filter((i) => i.type === "holders");
    const entranceAirdrop = airdrop.filter((i) => i.type === "attendees");

    const tickets = await this.database.ticket.findMany({
      where: {
        slug: { in: ticketsAirdrop.map((i) => i.ticketSlug) },
        Event: { slug: { in: ticketsAirdrop.map((i) => i.eventSlug) } }
      }
    });

    const entrances = await this.database.entrance.findMany({
      where: {
        Ticket: {
          slug: { in: entranceAirdrop.map((i) => i.ticketSlug) }
        },
        Event: { slug: { in: entranceAirdrop.map((i) => i.eventSlug) } }
      }
    });

    return { tickets, entrances };
  }
  private async getEligibleUsersForTicketHold(tickets: Ticket[]) {
    const usersMap = new Map<string, { user: any; count: number }>();

    await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const totalSupply = await this.getTotalSupply(ticket.address);
          const { owners, externalAddresses } =
            await this.ticketsService.owners(ticket.address, {
              start: 0,
              pageSize: totalSupply
            });

          owners.forEach((owner) => {
            const key = owner.smartWalletAddress;
            if (!usersMap.has(key)) {
              usersMap.set(key, { user: owner, count: 0 });
            }
            usersMap.get(key).count += 1;
          });

          externalAddresses.forEach((external) => {
            const key = external.walletAddress;
            if (!usersMap.has(key)) {
              usersMap.set(key, { user: external, count: 0 });
            }
            usersMap.get(key).count += 1;
          });
        } catch (e) {
          this.handleError(e);
        }
      })
    );

    const totalTickets = tickets.length;
    const eligibleUsersForAllTickets = Array.from(usersMap.values())
      .filter(({ count }) => count === totalTickets)
      .map(({ user }) => user);

    const users = eligibleUsersForAllTickets.filter((user) => !user?.external);
    const external = eligibleUsersForAllTickets.filter(
      (user) => user?.external
    );

    return {
      externalAddresses: external,
      owners: users
    };
  }

  private async getEligibleUsersForEntrances(entrances: Entrance[]) {
    return Promise.all(
      entrances.map(async (entrance) => {
        try {
          const { entries, externalAddresses } =
            await this.entranceService.entries(entrance.id);
          return {
            externalAddresses,
            entries
          };
        } catch (e) {
          this.handleError(e);
        }
      })
    );
  }

  private async getTotalSupply(address: string): Promise<number> {
    const result = await readContract(
      address,
      contractArtifacts["tickets"].abi,
      "totalSupply",
      []
    );
    return Number(result);
  }

  private handleError(e: any): never {
    throw new HttpException(e.message, 500);
  }
}