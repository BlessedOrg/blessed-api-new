import { encodeFunctionData } from "viem";
import { Bundler, createSmartAccountClient, LightSigner, PaymasterMode } from "@biconomy/account";
import { getVaultItem } from "@/lib/1pwd-vault";
import { contractArtifacts, getExplorerUrl, provider } from "@/lib/viem";
import { Capsule } from "@usecapsule/server-sdk";
import { CapsuleEthersV5Signer } from "@usecapsule/ethers-v5-integration";
import { envConstants } from "@/common/constants";

interface MetaTxParams {
  contractAddress: string;
  contractName: string;
  functionName: string;
  args: any[];
  capsuleTokenVaultKey: string;
  userWalletAddress?: string;
}

export const createSmartWallet = async (signer: LightSigner) =>
  createSmartAccountClient({
    signer: signer,
    bundlerUrl: envConstants.bundlerUrl, // <-- Read about this at https://docs.biconomy.io/dashboard#bundler-url
    biconomyPaymasterApiKey: envConstants.biconomyPaymasterApiKey, // <-- Read about at https://docs.biconomy.io/dashboard/paymaster
    rpcUrl: envConstants.rpcUrl // <-- read about this at https://docs.biconomy.io/account/methods#createsmartaccountclient
  });

export const biconomyMetaTx = async ({
  contractAddress,
  contractName,
  functionName,
  args,
  capsuleTokenVaultKey
}: MetaTxParams) => {
  const capsuleEnv = envConstants.capsuleEnv as any;
  const capsule = new Capsule(capsuleEnv, envConstants.capsuleApiKey);
  const vaultItem = await getVaultItem(capsuleTokenVaultKey, "capsuleKey");
  const userShare = vaultItem.fields.find((i) => i.id === "capsuleKey")?.value;
  await capsule.setUserShare(userShare);
  const ethersSigner = new CapsuleEthersV5Signer(capsule as any, provider);
  const smartWallet = await createSmartWallet(ethersSigner);

  const tx = {
    to: contractAddress,
    data: encodeFunctionData({
      abi: contractArtifacts[contractName].abi,
      functionName: functionName,
      args: args
    })
  };

  const smartWalletAddress = await smartWallet.getAddress();
  await provider.estimateGas({ from: smartWalletAddress, ...tx });

  const userOpResponse = await smartWallet.sendTransaction(tx, {
    paymasterServiceData: { mode: PaymasterMode.SPONSORED }
  });

  console.log("🫡 userOpResponse: ", userOpResponse);
  const { transactionHash } = await userOpResponse.waitForTxHash();

  console.log("💨 transactionHash", getExplorerUrl(transactionHash));

  let userOpReceipt;
  try {
    userOpReceipt = await userOpResponse.wait();
  } catch (error) {
    console.log("🚨error while waiting for userOpResponse", error.message);
    const bundlerResponse = await bundler.getUserOpByHash(userOpResponse.userOpHash);
    if (!!bundlerResponse) {
      userOpReceipt = await userOpResponse.wait();
    }
  }

  if (!userOpReceipt) {
    const getUserOpReceipt = await bundler.getUserOpReceipt(userOpResponse.userOpHash);
    console.log("🧾 getUserOpReceipt 2: ", getUserOpReceipt);
  }
  if (userOpReceipt && userOpReceipt?.success == "true") {
    return {
      data: {
        type: "paymaster-tx",
        transactionReceipt: userOpReceipt.receipt
      }
    };
  } else {
    throw new Error("🚨 error while waiting for userOpResponse");
  }
};

export const bundler = new Bundler({
  bundlerUrl: envConstants.bundlerUrl // Replace with Base Sepolia chain ID
});
