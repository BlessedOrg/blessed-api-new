import { shortenWalletAddress } from "@/utils/shortenWalletAddress";
import { envVariables } from "@/common/env-variables";

const {
  vaultAccessTokensId,
  vaultCapsuleTokensId,
  vaultApiKeysId,
  vaultStripeKeysId,
  vaultApiUrl,
  vaultToken
} = envVariables;
const headers = {
  Authorization: `Bearer ${vaultToken}`,
  "Content-Type": "application/json"
};
type IdPerType = {
  [K in VaultItemType]: string;
};

const idPerType: IdPerType = {
  capsuleKey: vaultCapsuleTokensId,
  accessToken: vaultAccessTokensId,
  apiKey: vaultApiKeysId,
  stripeKeys: vaultStripeKeysId
};
export async function createVaultCapsuleKeyItem(
  value: string,
  address: string,
  email: string,
  type: AccountType
) {
  const isBetaEnv = envVariables.isDevelopment;
  const vaultId = vaultCapsuleTokensId;
  try {
    const createdItem = await fetch(
      `${vaultApiUrl}/v1/vaults/${vaultId}/items`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          vault: {
            id: vaultId
          },
          title: `Capsule Token for ${type}: ${shortenWalletAddress(address)}`,
          category: "LOGIN",
          tags: [type, "capsuleWallet", isBetaEnv ? "BETA" : "Production"],
          fields: [
            {
              id: "email",
              type: "STRING",
              label: "Email",
              value: email
            },
            {
              id: "walletAddress",
              type: "STRING",
              label: "Wallet address",
              value: address
            },
            {
              id: "capsuleKey",
              type: "CONCEALED",
              label: "Capsule key",
              value
            }
          ]
        })
      }
    );
    return await createdItem.json();
  } catch (error: any) {
    throw new Error(`⛑️🔑 Failed to create Capsule Key in Vault for: ${email} \n ${error?.message}`);
  }
}

export async function createVaultAccessTokenItem(
  apiToken: string,
  developerId: string
) {
  try {
    const createdItem = await fetch(
      `${vaultApiUrl}/v1/vaults/${vaultAccessTokensId}/items`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          vault: {
            id: vaultAccessTokensId
          },
          title: `Access Token for developer ${developerId}`,
          category: "API_CREDENTIAL",
          tags: ["accessToken"],
          fields: [
            {
              id: "developerId",
              type: "STRING",
              label: "User ID",
              value: developerId
            },
            {
              id: "accessToken",
              label: "Access Token",
              type: "CONCEALED",
              value: apiToken
            }
          ]
        })
      }
    );
    return await createdItem.json();
  } catch (error: any) {
    throw new Error(`⛑️🔑 Failed to create Access Token in Vault for developer: ${developerId} \n ${error?.message}`);
  }
}

export async function createVaultApiKeyItem(apiKey: string, appSlug: string) {
  try {
    const isBetaEnv = envVariables.isDevelopment;
    const createdItem = await fetch(
      `${vaultApiUrl}/v1/vaults/${vaultApiKeysId}/items`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          vault: {
            id: vaultApiKeysId
          },
          title: `API Key for app ${appSlug}`,
          category: "API_CREDENTIAL",
          tags: ["apiKeys", isBetaEnv ? "BETA" : "Production"],
          fields: [
            {
              id: "appSlug",
              type: "STRING",
              label: "App Slug",
              value: appSlug
            },
            {
              id: "apiKey",
              label: "Api Key",
              type: "CONCEALED",
              value: apiKey
            }
          ]
        })
      }
    );
    return await createdItem.json();
  } catch (error: any) {
    throw new Error(`⛑️🔑 Failed to create API Key in Vault for app: ${appSlug} \n ${error?.message}`);
  }
}

export async function createVaultStripeKeysItem(stripeSecretKey: string, stripeWebhookSecret: string, appSlug: string) {
  const isBetaEnv = envVariables.isDevelopment;
  const response = await fetch(
    `${vaultApiUrl}/v1/vaults/${vaultStripeKeysId}/items`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        vault: {
          id: vaultStripeKeysId
        },
        title: `Stripe API keys for ${appSlug}`,
        category: "API_CREDENTIAL",
        tags: ["stripeApiKeys", isBetaEnv ? "BETA" : "Production"],
        fields: [
          {
            id: "stripeSecretKey",
            label: "Stripe Secret Key",
            type: "CONCEALED",
            value: stripeSecretKey
          },
          {
            id: "stripeWebhookSecret",
            label: "Stripe Webhook Secret",
            type: "CONCEALED",
            value: stripeWebhookSecret
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const errorMsg = `🚨 Failed to create Stripe keys in Vault for app ${appSlug}: ${errorText}`;
    console.log(errorMsg);
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function updateVaultStripeKeysItem(
  itemId: string,
  stripeSecretKey: string,
  stripeWebhookSecret: string
) {
  const response = await fetch(
    `${vaultApiUrl}/v1/vaults/${vaultStripeKeysId}/items/${itemId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify([
        {
          op: "replace",
          path: "/fields/stripeSecretKey/value",
          value: stripeSecretKey
        },
        {
          op: "replace",
          path: "/fields/stripeWebhookSecret/value",
          value: stripeWebhookSecret
        }
      ])
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const errorMsg = `🚨 Failed to update Stripe keys: ${errorText}`;
    console.log(errorMsg);
    throw new Error(errorMsg);
  }

  return await response.json();
}

export async function deleteVaultStripeKeysItem(itemId: string) {
  const response = await fetch(
    `${vaultApiUrl}/v1/vaults/${vaultStripeKeysId}/items/${itemId}`,
    {
      method: "DELETE",
      headers
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const errorMsg = `🚨 Failed to delete Stripe keys: ${errorText}`;
    console.log(errorMsg);
    throw new Error(errorMsg);
  }

  return { success: true, message: "Stripe keys deleted successfully" };
}


export async function getVaultItem(id: string, type?: VaultItemType) {
  const vaultId = idPerType[type];
  const createdItem = await fetch(
    `${vaultApiUrl}/v1/vaults/${vaultId}/items/${id}`,
    {
      headers: {
        Authorization: `Bearer ${vaultToken}`,
        "Content-Type": "application/json"
      }
    }
  );
  const vaultItem = await createdItem.json();
  if (vaultItem?.status === 400) {
    const errMsg = `Failed to retrieve ${type} from Vault: ${vaultItem?.message}`;
    throw new Error(errMsg);
  }
  return vaultItem;
}

export async function replaceVaultItemFields(
  id: string,
  newData: any,
  type?: VaultItemType
) {
  const vaultId = idPerType[type];

  const currentItemData = await getVaultItem(id, type);
  try {
    const updatedItem = await fetch(
      `${vaultApiUrl}/v1/vaults/${vaultId}/items/${id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...currentItemData,
          fields: [...currentItemData.fields, ...newData]
        })
      }
    );
    return await updatedItem.json();
  } catch (error: any) {
    console.log(`⛑️🔑 Failed to replace Vault item \n ${error?.message}`);
  }
}

export async function updateVaultItem(
  id: string,
  newData: { op: "replace" | "add" | "remove"; path: string; value?: any }[],
  type?: VaultItemType
) {
  const vaultId = idPerType[type];
  try {
    const updatedItem = await fetch(
      `${vaultApiUrl}/v1/vaults/${vaultId}/items/${id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(newData)
      }
    );
    return await updatedItem.json();
  } catch (error: any) {
    console.log(`⛑️🔑 Failed to update Vault item \n ${error?.message}`);
  }
}
