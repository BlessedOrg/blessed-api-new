import { Injectable } from "@nestjs/common";
import { DatabaseService } from "@/common/services/database/database.service";
import { ethers } from "ethers";
import { Interaction } from "@prisma/client";
import { GeneralStatsQueryDto } from "@/resources/analytics/dto/general-stats-query.dto";
import { shortenWalletAddress } from "@/utils/shortenWalletAddress";
import { isEmpty } from "lodash";

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
      events: events.map(i => ({ label: i.name, id: i.id, param: "event", key: "eventId" }))
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
    const { getBy, appId, eventId, developerId } = params || {};

    const devAccount = await this.database.developer.findUnique({
      where: { id: callerDevId },
      include: {
        Apps: true
      }
    });

    const isAdmin = devAccount.role === "ADMIN";

    const appsFilter = {
      all: isAdmin ? {} : { developerId: callerDevId },
      app: { id: appId },
      developer: { developerId },
      event: { Events: { some: { id: eventId } } }
    };

    const apps = await this.database.app.findMany({
      where: appsFilter[getBy],
      include: {
        Tickets: true,
        Events: true,
        Users: true
      }
    });

    const interactionsFilter = {
      all: isAdmin ? {} : { developerId: callerDevId },
      app: {
        OR: [
          { eventId: { in: apps[0].Events.map(e => e.id) } },
          { ticketId: { in: apps[0].Tickets.map(t => t.id) } },
          { userId: { in: apps[0].Users.map(u => u.id) } },
          { developerId: apps[0].developerId }
        ]
      },
      developer: { developerId },
      event: { eventId }
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

    return {
      eventsTransactions: this.formatTxToChartData(eventContractTransactionsWeiCost, eventContractTransactions),
      ticketsTransactions: this.formatTxToChartData(ticketContractTransactionsWeiCost, ticketContractTransactions),
      ticketsDeploy: this.formatTxToChartData(ticketsWeiCost, ticketsDeploy),
      eventsDeploy: this.formatTxToChartData(eventsWeiCost, eventsDeploy),
      costsByOperatorType: this.costsByOperatorType(allOnChainInteractions),
      count: {
        all: allOnChainInteractions.length,
        eventsTransactions: eventContractTransactions.length,
        ticketsTransactions: ticketContractTransactions.length,
        ticketsDeploy: ticketsDeploy.length,
        eventsDeploy: eventsDeploy.length
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
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(irys)),
        usdCost: this.getTotalUsdPrice(irys),
        label: "Data Storage"
      },
      biconomy: {
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(biconomy)),
        usdCost: this.getTotalUsdPrice(biconomy),
        label: "Gasless transactions"
      },
      operator: {
        ethCost: ethers.utils.formatEther(this.getTotalWeiPrice(operator)),
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
