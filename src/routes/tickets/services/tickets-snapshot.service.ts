import { CustomHttpException } from "@/common/exceptions/custom-error-exception";
import { DatabaseService } from "@/common/services/database/database.service";
import { contractArtifacts, readContract } from "@/lib/viem";
import { EventsService } from "@/routes/events/events.service";
import { AirdropDto, SnapshotDto } from "@/routes/tickets/dto/create-ticket.dto";
import { TicketsService } from "@/routes/tickets/tickets.service";
import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { Ticket } from "@prisma/client";
import { PrefixedHexString } from "ethereumjs-util";

@Injectable()
export class TicketsSnapshotService {
  constructor(
    private database: DatabaseService,
    private eventsService: EventsService,
    @Inject(forwardRef(() => TicketsService))
    private ticketsService: TicketsService
  ) {}

  async snapshot(snapshotDto: SnapshotDto) {
    try {
      const { snapshot } = snapshotDto;
      const { tickets, entranceTickets } = await this.getTicketsAndEntrances(snapshot);

      const [eligibleUsersForTicketHold, eligibleUsersForEntrance] = await Promise.all([
        this.getEligibleUsersForTicketHold(tickets, snapshotDto.isEachTicketRequirementMet),
        this.getEligibleUsersForEntrances(entranceTickets, snapshotDto.isEachTicketRequirementMet)
      ]);

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

      const isEntranceRequired = !!entranceTickets.length;
      const isOwnerRequired = !!tickets.length;

      let eligibleUsers: any[] = [];
      let eligibleExternalAddresses: any[] = [];

      const scenario = snapshotDto.isEachTicketRequirementMet ? `false_false`:`${isEntranceRequired}_${isOwnerRequired}`;

      switch (scenario) {
        case "true_true": {
          const usersWithMeetCriteria = Array.from(
            eligibleUsersForTicketHoldMap.keys()
          ).filter((user) => eligibleUsersForEntranceMap.has(user));

          eligibleUsers = usersWithMeetCriteria.map((user) =>
            eligibleUsersForTicketHoldMap.get(user)
          );
          eligibleExternalAddresses = Array.from(
            eligibleExternalAddressesForTicketHold
          )
            .filter((user) => eligibleExternalAddressesForEntrance.has(user))
            .map((i) => ({ walletAddress: i, external: true }));
          break;
        }

        case "true_false": {
          eligibleUsers = eligibleUsersForEntrance.flatMap((result) => result.entries);
          eligibleExternalAddresses = Array.from(
            eligibleExternalAddressesForEntrance
          ).map((i) => ({ walletAddress: i, external: true }));
          break;
        }

				case "false_false": {
					eligibleUsers = [...eligibleUsersForTicketHold.owners, ...eligibleUsersForEntrance.flatMap((result) => result.entries)];
					eligibleExternalAddresses = [...Array.from(eligibleExternalAddressesForTicketHold), ...Array.from(eligibleExternalAddressesForEntrance)];
					break;
				}

        default: {
          eligibleUsers = eligibleUsersForTicketHold.owners;
          eligibleExternalAddresses = Array.from(
            eligibleExternalAddressesForTicketHold
          ).map((i) => ({ walletAddress: i, external: true }));
        }
      }

      return {
        eligibleUsers,
        eligibleExternalAddresses,
        all: [...eligibleUsers, ...eligibleExternalAddresses]
      };
    } catch (e) {
      throw new CustomHttpException(e);
    }
  }

  private async getTicketsAndEntrances(airdrop: AirdropDto[]) {
    const ticketsAirdrop = airdrop.filter((i) => i.type === "holders");
    const entranceAirdrop = airdrop.filter((i) => i.type === "attendees");

    const tickets = await this.database.ticket.findMany({
      where: {
        id: { in: ticketsAirdrop.map((i) => i.ticketId) },
        Event: { id: { in: ticketsAirdrop.map((i) => i.eventId) } }
      }
    });

    const entranceTickets = await this.database.ticket.findMany({
      where: {
        id: { in: entranceAirdrop.map((i) => i.ticketId) },
        Event: { id: { in: entranceAirdrop.map((i) => i.eventId) } }
      }
    });

    return { tickets, entranceTickets };
  }
  private async getEligibleUsersForTicketHold(tickets: Ticket[], isEachTicketRequirementMet: boolean) {
    const usersMap = new Map<string, { user: any; count: number }>();

    await Promise.all(
      tickets.map(async (ticket) => {
        try {
          const totalSupply = await this.getTotalSupply(ticket.address as PrefixedHexString);
          const { owners, externalAddresses } =
            await this.ticketsService.getTicketOwners(ticket.address, {
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
          throw new CustomHttpException(e);
        }
      })
    );

    const totalTickets = tickets.length;
    const eligibleUsersForAllTickets = Array.from(usersMap.values())
      .filter(({ count }) => isEachTicketRequirementMet ? count === totalTickets : true)
      .map(({ user }) => user);

    const users = eligibleUsersForAllTickets.filter((user) => !user?.external);
    const external = eligibleUsersForAllTickets.filter((user) => user?.external);

    return {
      externalAddresses: external,
      owners: users
    };
  }

  private async getEligibleUsersForEntrances(tickets: Ticket[], isEachTicketRequirementMet: boolean) {
    return Promise.all(
      tickets.map(async (ticket) => {
        try {
          const { entries, externalAddresses } = await this.eventsService.getEventEntriesPerTicketId(ticket.id);
          return {
            externalAddresses,
            entries
          };
        } catch (e) {
          throw new CustomHttpException(e);
        }
      })
    );
  }

  private async getTotalSupply(address: PrefixedHexString): Promise<number> {
    const result = await readContract({
      abi: contractArtifacts["tickets"].abi,
      address,
      functionName: "totalSupply"
    });
    return Number(result);
  }

}
