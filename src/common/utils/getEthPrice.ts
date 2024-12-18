import { envVariables } from "@/common/env-variables";

export const getEthPrice = async (): Promise<{ value: string }> => {
  const ethPriceResponse = await fetch(`https://api.g.alchemy.com/prices/v1/${envVariables.alchemyApiKey}/tokens/by-symbol?symbols=ETH`);
  const pricesData = await ethPriceResponse.json();
  return pricesData?.data?.[0]?.prices?.[0] || { value: "0" };
};