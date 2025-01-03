import { ethers } from "ethers";
import { NonceManager } from "@ethersproject/experimental";
import { importAllJsonContractsArtifacts } from "@/lib/contracts/interfaces";
import { Abi, Chain, createPublicClient, createWalletClient, getAddress, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { envVariables } from "@/common/env-variables";
import { base } from "viem/chains";
import { PrefixedHexString } from "ethereumjs-util";
import { calculateClientTransactionFeeInWei } from "@/utils/transactions";

export const rpcUrl = envVariables.rpcUrl || "define RPC URL env ";
export const chainId = Number(envVariables.chainId) || 84532;
export const ethNativeCurrency = {
  decimals: 18,
  name: "ETH",
  symbol: "ETH"
};
const baseSepolia = {
  id: chainId,
  name: "BaseSepolia",
  nativeCurrency: ethNativeCurrency,
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: [""]
    }
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://sepolia.basescan.org"
    }
  }
};
const availableChains = {
  "84532": baseSepolia,
  "8453": { ...base, rpcUrls: { ...base.rpcUrls, default: { http: [rpcUrl], webSocket: [""] } } }
} as { [key: string]: Chain };

export const activeChain = availableChains[chainId];

export const account = privateKeyToAccount(`0x${process.env.OPERATOR_PRIVATE_KEY}`);

export const provider = new ethers.providers.JsonRpcProvider({
  skipFetchSetup: true,
  fetchOptions: {
    referrer: envVariables.BASE_URL!
  },
  url: rpcUrl!
});

const client = createWalletClient({
  chain: activeChain,
  account,
  transport: http(rpcUrl)
});

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(rpcUrl)
});

let nonce;

const initializeNonce = async () => {
  nonce = await fetchNonce();
};

const incrementNonce = () => {
  nonce += 1;
};

export const fetchNonce = async (address: string | null = null) => {
  const signer = provider.getSigner(account?.address);
  const nonceManager = new NonceManager(signer);
  return nonceManager.getTransactionCount("latest");
};

export const getExplorerUrl = (param: string): string => {
  if (param.length === 66) {
    return `${activeChain.blockExplorers.default.url}/tx/${param}`;
  } else if (param.length === 42) {
    return `${activeChain.blockExplorers.default.url}/address/${param}`;
  } else {
    throw new Error("Invalid input: must be a valid Ethereum address (40 signs) or transaction hash (64 signs)");
  }
};

export const deployContract = async (contractName, args) => {
  const contractArtifacts = importAllJsonContractsArtifacts();
  const hash = await client.deployContract({
    abi: contractArtifacts[contractName].abi,
    bytecode: contractArtifacts[contractName].bytecode?.object || contractArtifacts[contractName].bytecode,
    args,
    chain: undefined
  });

  let contractAddr;

  const receipt = await publicClient.waitForTransactionReceipt({
    confirmations: 1,
    hash
  }) as any;

  if (receipt?.contractAddress) {
    contractAddr = getAddress(receipt.contractAddress);
  }

  console.log("⛓️ Contract Explorer URL: ", getExplorerUrl(contractAddr));
  return { hash, contractAddr, gasWeiPrice: `${calculateClientTransactionFeeInWei(receipt)}` };
};

export const waitForTransactionReceipt = async (hash, confirmations = 1) => {
  return publicClient.waitForTransactionReceipt({
    hash,
    confirmations
  });
};

interface readWriteContractParams {
  abi: Abi;
  address: PrefixedHexString;
  functionName: string;
  args?: any[];
}

export const readContract = async ({ abi, address, functionName, args = null }: readWriteContractParams) => {
  return publicClient.readContract({
    abi,
    address: address as `0x${string}`,
    functionName,
    args
  });
};

export const writeContract = async ({ abi, address, functionName, args }: readWriteContractParams) => {
  await initializeNonce();
  const hash = await client.writeContract({
    address,
    functionName: functionName,
    args,
    abi,
    account,
    nonce
  } as any);
  console.log(`📟 ${functionName}TxHash: ${getExplorerUrl(hash)} 📟 Nonce: ${nonce}`);
  const receipt = await waitForTransactionReceipt(hash);
  const gasWeiPrice = calculateClientTransactionFeeInWei(receipt);
  return {
    ...receipt,
    gasWeiPrice
  };
};

export const contractArtifacts = importAllJsonContractsArtifacts();
