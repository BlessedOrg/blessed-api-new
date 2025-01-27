import { envVariables } from "@/common/env-variables";
import { DatabaseService } from "@/common/services/database/database.service";
import { contractArtifacts, readContract } from "@/lib/viem";
import { GeneralStatsQueryDto } from "@/routes/analytics/dto/general-stats-query.dto";
import { shortenWalletAddress } from "@/utils/shortenWalletAddress";
import { Injectable } from "@nestjs/common";
import { Interaction } from "@prisma/client";
import { ethers } from "ethers";
import { isEmpty } from "lodash";
import { fetchSubgraphData } from "@/lib/graph";

@Injectable()
export class AnalyticsService {
  constructor(private database: DatabaseService) {}

  async getAnalyticsFilter(devId: string) {
    const developer = await this.database.developer.findUnique({
      where: {
        id: devId
      }
    });

    const isAdmin = developer.role === "ADMIN";

    const apps = await this.database.app.findMany({
      where: isAdmin ? {} : {
        developerId: devId
      },
      include: {
        Events: true,
        Tickets: true
      }
    });

    const events = apps.flatMap(i => i.Events);

    const filters = {
      apps: apps.map(i => ({ label: i.name, id: i.id, param: "app", key: "appId" })),
      events: events.map(i => ({ label: i.name, id: i.id, param: "event", key: "eventId" })),
      tickets: apps.flatMap(i => i.Tickets).map(i => ({ label: i.name, id: i.id, param: "ticket", key: "ticketId" }))
    };

    if (isAdmin) {
      const developers = await this.database.developer.findMany();
      filters["developers"] = developers.map(i => ({ label: i.email || shortenWalletAddress(i.connectedWalletAddress), id: i.id, param: "developer", key: "developerId" }));
    }

    return {
      isAdmin,
      filters
    };
  }

  async getAdminStatistics(callerDevId: string, params: GeneralStatsQueryDto) {

    const { getBy, appId, eventId, developerId, ticketId } = params || {};

    const devAccount = await this.database.developer.findUnique({
      where: { id: callerDevId }
    });

    const isAdmin = devAccount.role === "ADMIN";

    const appsFilter = {
      all: isAdmin ? {} : { developerId: callerDevId },
      app: appId ? { id: appId } : {},
      developer: developerId ? { developerId } : {},
      event: eventId ? { Events: { some: { id: eventId } } } : {},
      ticket: ticketId ? { Tickets: { some: { id: ticketId } } } : {}
    };

    const apps = await this.database.app.findMany({
      where: appsFilter[getBy],
      include: {
        Tickets: ticketId ? {
          where: {
            id: ticketId
          }
        } : true,
        Events: {
          include: {
            Tickets: {
              where: ticketId ? { id: ticketId } : undefined,
              select: {
                address: true
              }
            }
          }
        },
        Users: true
      }
    });

    const interactionsFilter = {
      all: isAdmin ? {} : { developerId: callerDevId },
      app: {
        OR: [
          { eventId: { in: apps?.flatMap(i => i.Events)?.map(e => e.id) } },
          { ticketId: { in: apps?.flatMap(i => i.Tickets)?.map(t => t.id) } },
          { userId: { in: apps?.flatMap(i => i.Users)?.map(u => u.id) } }
        ]
      },
      developer: { developerId },
      event: { eventId },
      ticket: { ticketId }
    };

    const allOnChainInteractions = await this.database.interaction.findMany({
      where: interactionsFilter[getBy]
    });

    const eventsDeploy = allOnChainInteractions.filter(i => i.method.includes("deployEventContract"));
    const eventsWeiCost = eventsDeploy.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);

    const ticketsDeploy = allOnChainInteractions.filter(i => i.method.includes("deployTicketContract"));
    const ticketsWeiCost = ticketsDeploy.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);

    const ticketContractTransactions = allOnChainInteractions.filter(i => i.method.includes("-ticket"));
    const ticketContractTransactionsWeiCost = ticketContractTransactions.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);

    const eventContractTransactions = allOnChainInteractions.filter(i => i.method.includes("-event"));
    const eventContractTransactionsWeiCost = eventContractTransactions.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);

    const usersTransactions = allOnChainInteractions.filter(i => !!i?.userId);
    const usersTransactionsWeiCost = usersTransactions.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);

    const fiatStripeIncomeRecords = allOnChainInteractions.filter(i => i.method.includes("fiat-stripe"));
    const fiatStripeIncome = fiatStripeIncomeRecords.map(i => ({
      priceCents: i.value,
      currency: i.currency
    }));

    const subgraphFilters = {
      app: {
        filter: `(where: {ticket_: {address_in: $addresses}})`,
        variableDefinition: `($addresses: [String!]!)`,
        variableName: "addresses",
        variables: {
          addresses: apps
            ?.flatMap(i => i.Tickets)
            ?.map(i => i.address)
        }
      },
      event: {
        filter: `(where: {ticket_: {address_in: $addresses}})`,
        variableDefinition: `($addresses: [String!]!)`,
        variableName: "addresses",
        variables: {
          addresses: apps
            ?.flatMap(i => i.Events)
            ?.flatMap(i => i.Tickets)
            ?.map(i => i.address)
        }
      },
      ticket: {
        filter: `(where: {ticket_: {address: $ticketAddress}})`,
        variableDefinition: `($ticketAddress: String!)`,
        variableName: "ticketAddress",
        variables: {
          ticketAddress: apps
            ?.flatMap(i => i.Events)
            ?.flatMap(i => i.Tickets)
            ?.map(i => i.address)[0]
        }
      }
    };

    const subgraphRequestBody = {
      query: `
        query Transfers${subgraphFilters?.[getBy]?.variableDefinition ?? ""} {
          transfers ${subgraphFilters?.[getBy]?.filter ?? ""} {
            price
            stakeholdersShare
            tokenId
            to
            ticket {
              address
              ownerSmartWallet
            }
          }
        }
      `,
      operationName: "Transfers",
      variables: subgraphFilters?.[getBy]?.variables ?? {}
    }
    const subgraphData = await fetchSubgraphData(subgraphRequestBody);

    const erc20Decimals = await readContract({
      abi: contractArtifacts["erc20"].abi,
      address: envVariables.erc20Address,
      functionName: "decimals"
    });

    const ticketsPurchaseIncome = subgraphData?.data?.transfers?.reduce((sum, transfer) => {
      sum.totalPrice += Number(transfer.price);
      sum.totalStakeholdersShare += Number(transfer.stakeholdersShare);
      return {
        totalPrice: sum.totalPrice / 10 ** Number(erc20Decimals),
        totalStakeholdersShare: sum.totalStakeholdersShare / 10 ** Number(erc20Decimals)
      };
    }, { totalPrice: Number(0), totalStakeholdersShare: Number(0) });

    return {
      income: {
        fiat: {
          stripe: fiatStripeIncome
        },
        crypto: {
          totalIncome: ticketsPurchaseIncome?.totalPrice ?? 0,
          totalStakeholdersShare: ticketsPurchaseIncome?.totalStakeholdersShare ?? 0
        }
      },
      expense: {
        eventsTransactions: this.formatTxToChartData(eventContractTransactionsWeiCost, eventContractTransactions),
        ticketsTransactions: this.formatTxToChartData(ticketContractTransactionsWeiCost, ticketContractTransactions),
        ticketsDeploy: this.formatTxToChartData(ticketsWeiCost, ticketsDeploy),
        eventsDeploy: this.formatTxToChartData(eventsWeiCost, eventsDeploy),
        costsByOperatorType: this.costsByOperatorType(allOnChainInteractions),
        usersTransactions: this.formatTxToChartData(usersTransactionsWeiCost, usersTransactions),
        count: {
          all: allOnChainInteractions.length,
          eventsTransactions: eventContractTransactions.length,
          ticketsTransactions: ticketContractTransactions.length,
          ticketsDeploy: ticketsDeploy.length,
          eventsDeploy: eventsDeploy.length
        }
      }
    };
  }

  private formatTxToChartData = (totalCost, transactions: Interaction[]) => {
    return {
      ethCost: ethers.utils.formatEther(BigInt(totalCost)),
      usdCost: this.getTotalUsdPrice(transactions),
      data: transactions.map(i => {
        return {
          ...(i.method.includes("deploy") ? {} : { method: this.extractTxName(i.method) }),
          timestamp: new Date(i.createdAt).getTime(),
          ethCost: ethers.utils.formatEther(i.gasWeiPrice),
          usdCost: i.gasUsdPrice
        };
      })
    };
  };

  private costsByOperatorType = (allOnChainInteractions: Interaction[]) => {
    const irys = allOnChainInteractions.filter(i => i.operatorType === "irys");
    const biconomy = allOnChainInteractions.filter(i => i.operatorType === "biconomy");
    const operator = allOnChainInteractions.filter(i => i.operatorType === "operator");

    return {
      irys: {
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(irys).toString()),
        usdCost: this.getTotalUsdPrice(irys),
        label: "Data Storage"
      },
      biconomy: {
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(biconomy).toString()),
        usdCost: this.getTotalUsdPrice(biconomy),
        label: "Gasless transactions"
      },
      operator: {
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(operator).toString()),
        usdCost: this.getTotalUsdPrice(operator),
        label: "On-chain transactions"
      }
    };
  };

  private extractTxName(input: string): string {
    return input.split("-")[0];
  }
  private getTotalWeiPrice = (interactions: Interaction[]) => {
    return interactions.reduce((a: any, b) => {
      return Number(a) + Number(b.gasWeiPrice);
    }, [0]);
  };
  private getTotalUsdPrice = (interactions: Interaction[]) => {
    if (isEmpty(interactions)) {
      return 0;
    }
    return interactions.reduce((a: any, b) => {
      return Number(a) + Number(b.gasUsdPrice);
    }, [0]);
  };
}
