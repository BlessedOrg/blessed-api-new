import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

export {};
declare global {
  interface IAuthGuard extends CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
  }

  type VaultItemType = "accessToken" | "capsuleKey" | "apiKey";
  type AccountType = "user" | "developer";

  //jwt's payload
  type ApiTokenJWT = {
    appSlug: string;
    apiTokenId: string;
    developerId: string;
    capsuleTokenVaultKey: string;
  };

  type UserAccessTokenJWT = {
    userId: string;
    capsuleTokenVaultKey: string;
    walletAddress: `0x${string}`;
    email: string;
  };

  type DeveloperAccessTokenJWT = {
    developerId: string;
    walletAddress: string;
    accessTokenVaultKey: string;
    capsuleTokenVaultKey: string;
  };

  type AppValidate = {
    appId: string;
  };

  type TicketValidate = {
    ticketId: string;
    ticketContractAddress: string;
  };

  // Requests
  type RequestWithTicketValidate = Request & TicketValidate;
  type RequestWithAppValidate = Request & AppValidate;
  type RequestWithDevAccessToken = Request & DeveloperAccessTokenJWT;
  type RequestWithUserAccessToken = Request & UserAccessTokenJWT;
  type RequestWithApiKey = Request & ApiTokenJWT;
  type RequestWithApiKeyOrDevAccessToken =
    | (Request & RequestWithApiKey)
    | RequestWithDevAccessToken;
  type RequestWithApiKeyAndUserAccessToken = Request &
    RequestWithApiKey &
    RequestWithUserAccessToken;
}
