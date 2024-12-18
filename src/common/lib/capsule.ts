"use server";
import { Capsule, PregenIdentifierType, WalletType } from "@usecapsule/server-sdk";
import { createVaultCapsuleKeyItem, getVaultItem } from "@/lib/1pwd-vault";
import { formatEmailToAvoidCapsuleConflict } from "@/utils/formatEmailToAvoidCapsuleConflict";
import { createCapsuleAccount as createCapsuleViemAccount, createCapsuleViemClient } from "@usecapsule/viem-v2-integration";
import { activeChain, provider, rpcUrl } from "@/lib/viem";
import { http } from "viem";
import { CapsuleEthersV5Signer } from "@usecapsule/ethers-v5-integration";
import { createSmartWallet } from "@/lib/biconomy";
import { envVariables } from "@/common/env-variables";

const capsuleEnv = envVariables.capsuleEnv as any;
const getCapsuleInstance = () =>
  new Capsule(capsuleEnv, envVariables.capsuleApiKey, {
    supportedWalletTypes: {
      EVM: true
    }
  });

export const createCapsuleAccount = async (accountId: string, identifier: string, type: AccountType) => {
  let email;
  const identifierType = identifier.includes("@") ? "email" : "connectedWalletAddress";
  if (identifierType === "email") {
    email = identifier;
  } else {
    const formattedAddress = `${identifier.toString().substring(0, 4)}.${identifier
      .toString()
      .slice(-4)}`;
    email = `wallet.user.${formattedAddress}@blessed.fan`;
  }
  const capsule = getCapsuleInstance();
  const formattedEmail = formatEmailToAvoidCapsuleConflict(email, accountId);
  const hasWallet = await capsule.hasPregenWallet(accountId);
  const walletType = "EVM" as WalletType;
  const pregenIdentifierType = "EMAIL" as PregenIdentifierType;
  if (!hasWallet) {
    try {
      const { address } = await capsule.createWalletPreGen(walletType, formattedEmail, pregenIdentifierType) as { address: string };
      if (!address) {
        throw new Error("Could not create a wallet, service temporarily not available.");
      }
      const userShare = capsule.getUserShare() as string;
      const ethersSigner = new CapsuleEthersV5Signer(capsule as any, provider);
      const smartWallet = await createSmartWallet(ethersSigner);
      const smartWalletAddress = await smartWallet.getAddress();
      const vaultItem = await createVaultCapsuleKeyItem(userShare, address, email, type);
      const data = {
        capsuleTokenVaultKey: vaultItem.id,
        walletAddress: address?.toLowerCase(),
        smartWalletAddress: smartWalletAddress?.toLowerCase()
      };
      return { data };
    } catch (e) {
      throw new Error(e.message);
    }
  } else {
    const wallets = await capsule.getPregenWallets(formattedEmail, pregenIdentifierType);
    const message = `‼️💳 Pregenerated wallet already exists \n User with ${email} has ${wallets.length} pregenerated wallets \n Potential databases/emails conflict`;
    throw new Error(message);
  }
};

export async function getCapsuleSigner(capsuleTokenVaultKey: string) {
  const capsule = getCapsuleInstance();
  const vaultItem = await getVaultItem(capsuleTokenVaultKey, "capsuleKey");
  const userShare = vaultItem.fields.find((i) => i.id === "capsuleKey")?.value;
  await capsule.setUserShare(userShare);
  const account = createCapsuleViemAccount(capsule);
  const capsuleViemClient = createCapsuleViemClient(capsule, {
    chain: activeChain,
    transport: http(rpcUrl) as any,
    account
  });

  console.log(`📝 Capsule signer: ${account.address}`);
  const accountInstance = {
    signMessage: (message: string) => account.signMessage({ message }),
    getAddress: () => Promise.resolve(account.address),
    signTypedData: (props: any) => account.signTypedData(props),
    getChainId: () => Promise.resolve(activeChain.id)
  } as any;
  return {
    ...capsuleViemClient,
    ...accountInstance
  };
};

export async function getSmartWalletForCapsuleWallet(capsuleTokenVaultKey: string) {
  const capsule = new Capsule(capsuleEnv, envVariables.capsuleApiKey);
  const vaultItem = await getVaultItem(capsuleTokenVaultKey, "capsuleKey");
  const userShare = vaultItem.fields.find((i) => i.id === "capsuleKey")?.value;
  await capsule.setUserShare(userShare);

  const ethersSigner = new CapsuleEthersV5Signer(capsule as any, provider);
  return createSmartWallet(ethersSigner);
}