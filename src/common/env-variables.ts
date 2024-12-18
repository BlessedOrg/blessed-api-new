require("dotenv").config();

const envVariables = {
  baseUrl: process.env.baseUrl,
  jwtSecret: process.env.JWT_SECRET,
  vaultApiUrl: process.env.OP_VAULT_SERVER_HOST!,
  vaultToken: process.env.OP_API_TOKEN!,
  vaultCapsuleTokensId: process.env.OP_CAPSULE_KEY_VAULT_ID!,
  vaultAccessTokensId: process.env.OP_ACCESS_TOKEN_VAULT_ID!,
  vaultApiKeysId: process.env.OP_API_KEY_VAULT_ID!,
  isDevelopment: process.env.NODE_ENV === "development",
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${process.env.CHAIN_ID}/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44`, // <-- Read about this at https://docs.biconomy.io/dashboard#bundler-url
  biconomyPaymasterApiKey: process.env.BICONOMY_API_KEY, // <-- Read about at https://docs.biconomy.io/dashboard/paymaster
  capsuleEnv: process.env.CAPSULE_ENV,
  capsuleApiKey: process.env.CAPSULE_API_KEY,
  chainId: process.env.CHAIN_ID,
  rpcUrl: process.env.JSON_RPC_URL,
  BASE_URL: process.env.BASE_URL,
  mail: {
    pass: process.env.SMTP_PASSWORD,
    email: process.env.SMTP_EMAIL,
    port: process.env.SMTP_PORT,
    host: process.env.SMTP_HOST
  },
  port: parseInt(process.env.PORT, 10) || 3000,
  landingPageUrl: process.env.LANDING_PAGE_URL,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  erc20Address: process.env.ERC20_CONTRACT_ADDRESS,
  ticketerAppUrl: process.env.TICKETER_APP_URL,
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
  reclaimAppId: process.env.RECLAIM_APP_ID,
  alchemyApiKey: process.env.ALCHEMY_API_KEY
};

export { envVariables };
