import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { PrefixedHexString } from "ethereumjs-util";

export {};
declare global {
  interface IAuthGuard extends CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
  }

  type VaultItemType = "accessToken" | "capsuleKey" | "apiKey";
  type AccountType = "user" | "developer";

  //JWT's payload
  type ApiTokenJWT = {
    appSlug: string;
    apiTokenId: string;
    developerId: string;
    developerWalletAddress: PrefixedHexString;
    developerSmartWalletAddress: PrefixedHexString;
    capsuleTokenVaultKey: string;
    appId: string;
  };

  type UserAccessTokenJWT = {
    userId: string;
    capsuleTokenVaultKey: string;
    walletAddress: PrefixedHexString;
    email: string;
  };
  type AppValidate = {
    appId: string;
  };
  type DeveloperAccessTokenJWT = {
    developerId: string;
    walletAddress: PrefixedHexString;
    smartWalletAddress: PrefixedHexString;
    accessTokenVaultKey: string;
    capsuleTokenVaultKey: string;
  };

  type EventValidate = {
    eventId: string;
    eventSlug: string;
  };

  type TicketValidate = {
    ticketId: string;
    ticketContractAddress: PrefixedHexString;
  };

  // Requests
  type RequestWithDevAccessToken = Request & DeveloperAccessTokenJWT;
  type RequestWithUserAccessToken = Request & UserAccessTokenJWT;
  type RequestWithApiKey = Request & ApiTokenJWT;
  type RequestWithApiKeyOrDevAccessToken = Request & (DeveloperAccessTokenJWT | ApiTokenJWT);
  type RequestWithApiKeyAndUserAccessToken = Request & RequestWithApiKey & RequestWithUserAccessToken;
}
