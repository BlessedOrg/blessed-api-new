import { hexToBigInt } from "viem";

export function calculateClientTransactionFeeInWei(receipt: any) {
  const { gasUsed, effectiveGasPrice, l1Fee } = receipt as {
    gasUsed: bigint
    effectiveGasPrice: bigint
    l1Fee: `0x${string}`
  };
  const l1FeeBigInt = hexToBigInt(l1Fee) as bigint;
  const totalFeeWei: bigint = (gasUsed * effectiveGasPrice) + l1FeeBigInt;

  return Number(totalFeeWei).toString();
}