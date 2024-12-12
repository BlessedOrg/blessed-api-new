import { envVariables } from "@/common/env-variables";

export const countExecutionTime = async <T>(
  callback: () => Promise<T>,
  key = "FUNCTION"
): Promise<T> => {
  if (!envVariables.isDevelopment) {
    return callback();
  }
  const startTime = performance.now();
  const callbackResponse = await callback();
  const endTime = performance.now();
  console.log(`\x1b[31m${key} execution time: ${((endTime - startTime) / 1000).toFixed(3)} seconds \x1b[0m`);
  return callbackResponse;
};