require('dotenv').config();

const envConstants = {
  jwtSecret: process.env.JWT_SECRET,
  vaultApiUrl: process.env.OP_VAULT_SERVER_HOST!,
  vaultToken: process.env.OP_API_TOKEN!,
  vaultCapsuleTokensId: process.env.OP_CAPSULE_KEY_VAULT_ID!,
  vaultAccessTokensId: process.env.OP_ACCESS_TOKEN_VAULT_ID!,
  vaultApiKeysId: process.env.OP_API_KEY_VAULT_ID!,
};

export { envConstants };
