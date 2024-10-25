import { SetMetadata } from '@nestjs/common';

const IS_PUBLIC_KEY = 'isPublicRequest';
const PublicRequest = () => SetMetadata(IS_PUBLIC_KEY, true);
const IS_DEVELOPER_AUTH_KEY = 'isDeveloperAuth';
const RequireDeveloperAuth = () => SetMetadata(IS_DEVELOPER_AUTH_KEY, true);

const IS_USER_AUTH_KEY = 'isUserAuth';
const RequireUserAuth = () => SetMetadata(IS_USER_AUTH_KEY, true);

const IS_API_KEY_AUTH_KEY = 'isApiKeyAuth';
const RequireApiKey = () => SetMetadata(IS_API_KEY_AUTH_KEY, true);

const IS_USER_AND_API_KEY_AUTH_KEY = 'isUserAndApiKeyAuth';
const RequireUserAndApiKey = () =>
  SetMetadata(IS_USER_AND_API_KEY_AUTH_KEY, true);

const IS_DEVELOPER_OR_API_KEY_AUTH_KEY = 'isDeveloperOrApiKeyAuth';
const RequireDeveloperAuthOrApiKey = () =>
  SetMetadata(IS_DEVELOPER_OR_API_KEY_AUTH_KEY, true);
export const authGuardKeysArray = [
  IS_PUBLIC_KEY,
  IS_DEVELOPER_AUTH_KEY,
  IS_USER_AUTH_KEY,
  IS_API_KEY_AUTH_KEY,
  IS_USER_AND_API_KEY_AUTH_KEY,
  IS_DEVELOPER_OR_API_KEY_AUTH_KEY,
];
export {
  PublicRequest,
  RequireDeveloperAuth,
  RequireUserAuth,
  RequireUserAndApiKey,
  RequireApiKey,
  RequireDeveloperAuthOrApiKey,
  IS_PUBLIC_KEY,
  IS_DEVELOPER_AUTH_KEY,
  IS_USER_AUTH_KEY,
  IS_API_KEY_AUTH_KEY,
  IS_USER_AND_API_KEY_AUTH_KEY,
  IS_DEVELOPER_OR_API_KEY_AUTH_KEY,
};
