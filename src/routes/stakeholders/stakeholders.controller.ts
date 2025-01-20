import { RequireDeveloperAuth } from "@/common/decorators/auth.decorator";
import { UseEventIdInterceptor } from "@/common/decorators/event-id-decorator";
import { UseAppIdInterceptor } from "@/common/decorators/use-app-id.decorator";
import { UseTicketIdInterceptor } from "@/common/decorators/use-ticket-id.decorator";
import { StakeholderDto } from "@/routes/stakeholders/dto/stakeholder-dto";
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Req
} from "@nestjs/common";
import { PaymentMethod } from "@prisma/client";
import { StakeholdersService } from "./stakeholders.service";

@Controller("private/stakeholders")
export class StakeholdersController {
  constructor(private readonly stakeholdersService: StakeholdersService) {}

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor(false)
  @UseTicketIdInterceptor(false)
  @Post(["add/:app", "add/:app/:event", "add/:app/:event/:ticketId"])
  async addStakeholders(
    @Body()
    body: {
      stakeholders: StakeholderDto[];
    },
    @Req()
    req: RequestWithDevAccessToken &
      AppValidate &
      EventValidate &
      TicketValidate
  ) {
    return this.stakeholdersService.createStakeholder(body.stakeholders, {
      appId: req.appId,
      eventId: req.eventId,
      ticketId: req.ticketId
    });
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor(false)
  @UseTicketIdInterceptor(false)
  @Post([
    "payment-method/:app",
    "payment-method/:app/:event",
    "payment-method/:app/:event/:ticketId"
  ])
  async togglePaymentMethod(
    @Body()
    body: {
      paymentMethod: PaymentMethod[];
    },
    @Req()
    req: RequestWithDevAccessToken &
      AppValidate &
      EventValidate &
      TicketValidate
  ) {
    return this.stakeholdersService.togglePaymentMethod(body.paymentMethod, {
      appId: req.appId,
      eventId: req.eventId,
      ticketId: req.ticketId
    });
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor(false)
  @UseTicketIdInterceptor(false)
  @Get([":app", ":app/:event", ":app/:event/:ticketId"])
  async getStakeholders(
    @Req()
    req: RequestWithDevAccessToken &
      AppValidate &
      EventValidate &
      TicketValidate
  ) {
    return this.stakeholdersService.getStakeholders({
      appId: req.appId,
      eventId: req.eventId,
      ticketId: req.ticketId
    });
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @UseEventIdInterceptor(false)
  @UseTicketIdInterceptor(false)
  @Delete([
    ":stakeholderId/:app",
    ":stakeholderId/:app/:event",
    ":stakeholderId/:app/:event/:ticketId"
  ])
  async deleteStakeholder(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Param("stakeholderId") stakeholderId: string
  ) {
    return this.stakeholdersService.deleteStakeholder(stakeholderId, req.appId);
  }

  @RequireDeveloperAuth()
  @UseAppIdInterceptor()
  @Post(":app/notify")
  async notifyStakeholders(
    @Req() req: RequestWithDevAccessToken & AppValidate,
    @Body()
    body: {
      stakeholdersIds: string[];
    }
  ) {
    return this.stakeholdersService.notifyStakeholder(
      body.stakeholdersIds,
      req.appId
    );
  }
}
