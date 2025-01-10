import { hexToBigInt } from "viem";

export function calculateClientTransactionFeeInWei(receipt: any) {
  const { gasUsed, effectiveGasPrice, l1Fee } = receipt as {
    gasUsed: bigint | `0x${string}`;
    effectiveGasPrice: bigint | `0x${string}`;
    l1Fee: `0x${string}`;
  };

  const l1FeeBigInt = formatHexIfNeeded(l1Fee) as bigint;
  const totalFeeWei: bigint =
    formatHexIfNeeded(gasUsed) * formatHexIfNeeded(effectiveGasPrice) +
    l1FeeBigInt;

  return Number(totalFeeWei).toString();
}

const formatHexIfNeeded = (value: bigint | `0x${string}`) => {
  if (typeof value === "bigint") {
    return value;
  }
  return hexToBigInt(value);
};
