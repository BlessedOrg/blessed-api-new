import { envVariables } from "@/common/env-variables";

export async function fetchSubgraphData(body: {
  query: string;
  operationName: string;
  variables?: object;
}): Promise<any> {
  const subgraphUrl = `https://gateway.thegraph.com/api/${envVariables.subgraphApiKey}/subgraphs/id/${envVariables.subgraphId}`;
  const response = await fetch(subgraphUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return response.json();
}