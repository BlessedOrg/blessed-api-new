import { envVariables } from "@/common/env-variables";
import { getVaultItem } from "@/lib/1pwd-vault";
import { contractArtifacts, getExplorerUrl, provider } from "@/lib/viem";
import { Bundler, createSmartAccountClient, LightSigner, PaymasterMode, UserOpReceipt } from "@biconomy/account";
import { CapsuleEthersV5Signer } from "@usecapsule/ethers-v5-integration";
import { Capsule } from "@usecapsule/server-sdk";
import { encodeFunctionData } from "viem";
import { calculateClientTransactionFeeInWei } from '../utils/transactions';

interface MetaTxParams {
  contractName: "tickets" | "event";
  address: string;
  functionName: string;
  args: any[];
  capsuleTokenVaultKey: string;
  userWalletAddress?: string;
  interaction?: () => Promise<void>;
}

export const createSmartWallet = async (signer: LightSigner) =>
  createSmartAccountClient({
    signer: signer,
    bundlerUrl: envVariables.bundlerUrl, // <-- Read about this at https://docs.biconomy.io/dashboard#bundler-url
    biconomyPaymasterApiKey: envVariables.biconomyPaymasterApiKey, // <-- Read about at https://docs.biconomy.io/dashboard/paymaster
    rpcUrl: envVariables.rpcUrl // <-- read about this at https://docs.biconomy.io/account/methods#createsmartaccountclient
  });

export const biconomyMetaTx = async ({ contractName, address, functionName, args, capsuleTokenVaultKey }: MetaTxParams) => {
  const abi = contractArtifacts[contractName].abi;
  const capsuleEnv = envVariables.capsuleEnv as any;
  const capsule = new Capsule(capsuleEnv, envVariables.capsuleApiKey);
  const vaultItem = await getVaultItem(capsuleTokenVaultKey, "capsuleKey");
  const userShare = vaultItem.fields.find((i) => i.id === "capsuleKey")?.value;
  await capsule.setUserShare(userShare);
  const ethersSigner = new CapsuleEthersV5Signer(capsule as any, provider);
  const smartWallet = await createSmartWallet(ethersSigner);

  const tx = {
    to: address,
    data: encodeFunctionData({
      abi,
      functionName: functionName,
      args: args
    })
  };

  const smartWalletAddress = await smartWallet.getAddress();
  await provider.estimateGas({ from: smartWalletAddress, ...tx });

  const userOpResponse = await smartWallet.sendTransaction(tx, {
    paymasterServiceData: { mode: PaymasterMode.SPONSORED }
  });

  console.log("➡️ Function: ", functionName);
  console.log("🫡 userOp Hash: ", userOpResponse.userOpHash);

  let userOpReceipt: UserOpReceipt;
  try {
    userOpReceipt = await userOpResponse.wait(1);
  } catch (error) {
    console.log("🚨error while waiting for userOpResponse", error.message);
    const bundlerResponse = await bundler.getUserOpByHash(userOpResponse.userOpHash);
    if (!!bundlerResponse) {
      userOpReceipt = await userOpResponse.wait(1);
    }
  }

  if (!userOpReceipt) {
    const getUserOpReceipt = await bundler.getUserOpReceipt(userOpResponse.userOpHash);
    console.log("🧾 getUserOpReceipt 2: ", getUserOpReceipt);
  }
  if (userOpReceipt && userOpReceipt?.success == "true") {
    const transactionHash = userOpReceipt.receipt.transactionHash;

    const actualGasCost = calculateClientTransactionFeeInWei(userOpReceipt.receipt);

    console.log("💨 transactionHash", getExplorerUrl(transactionHash));
    return {
      data: {
        type: "paymaster-tx",
        transactionReceipt: userOpReceipt.receipt,
        actualGasCost: `${actualGasCost}`
      }
    };
  } else {
    throw new Error("🚨 error while waiting for userOpResponse");
  }
};

export const bundler = new Bundler({
  bundlerUrl: envVariables.bundlerUrl // Replace with Base Sepolia chain ID
});
