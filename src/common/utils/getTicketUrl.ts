import { envVariables } from "@/common/env-variables";

export const getTicketUrl = (appSlug, ticketId, tokenId, userId, eventId) =>
  `${envVariables.landingPageUrl}/show-ticket?app=${appSlug}&contractId=${ticketId}&tokenId=${tokenId}&userId=${userId}&eventId=${eventId}`;


