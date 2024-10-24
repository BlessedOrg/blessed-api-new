"use server";
import { Environment } from "@usecapsule/core-sdk";
import { Capsule, PregenIdentifierType, WalletType } from "@usecapsule/server-sdk";
import { createVaultCapsuleKeyItem, getVaultItem } from "@/lib/1pwd-vault";
import { createCapsuleAccount as createCapsuleViemAccount, createCapsuleViemClient } from "@usecapsule/viem-v2-integration";
import { activeChain, rpcUrl } from "@/lib/viem";
import { http } from "viem";
import { formatEmailToAvoidCapsuleConflict } from "@/utils/formatEmailToAvoidCapsuleConflict";

const getCapsuleInstance = () =>
  new Capsule(Environment.BETA, process.env.CAPSULE_API_KEY, {
    supportedWalletTypes: {
      EVM: true
    }
  });

export const createCapsuleAccount = async (
  accountId: string,
  email: string,
  type: AccountType
) => {
  const capsule = getCapsuleInstance();
  const formattedEmail = formatEmailToAvoidCapsuleConflict(email, accountId);
  const hasWallet = await capsule.hasPregenWallet(formattedEmail);
  const walletType = "EVM" as WalletType;
  const pregenIdentifierType = "EMAIL" as PregenIdentifierType;
  if (!hasWallet) {
    try {
      const { address } = (await capsule.createWalletPreGen(
        walletType,
        formattedEmail,
        pregenIdentifierType
      )) as { address: string };
      if (!address) {
        throw new Error("Could not create a wallet, service temporarily not available.");
      }
      const userShare = capsule.getUserShare() as string;
      const vaultItem = await createVaultCapsuleKeyItem(
        userShare,
        address,
        email,
        type
      );
      const data = {
        capsuleTokenVaultKey: vaultItem.id,
        walletAddress: address?.toLowerCase()
      };
      return { data };
    } catch (e) {
      throw new Error(e.message);
    }
  } else {
    const wallets = await capsule.getPregenWallets(
      formattedEmail,
      pregenIdentifierType
    );
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
}
