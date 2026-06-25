import { factoryAbi } from "./abi/factory";
import { circleAbi } from "./abi/circle";
import { erc20Abi } from "./abi/erc20";

export const USDC_DECIMALS = 6; // ERC-20 USDC on Arc uses 6 decimals.

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x3600000000000000000000000000000000000000") as `0x${string}`;

export { factoryAbi, circleAbi, erc20Abi };

export const CircleState = {
  Recruiting: 0,
  Active: 1,
  Completed: 2,
  Cancelled: 3,
} as const;

export type CircleStateValue =
  (typeof CircleState)[keyof typeof CircleState];

export async function multicallSafe(client: any, contracts: any[]) {
  try {
    return await client.multicall({ contracts });
  } catch (error: any) {
    console.warn("Multicall failed or not supported, falling back to individual calls:", error);
    const promises = contracts.map(async (c) => {
      try {
        const res = await client.readContract({
          address: c.address,
          abi: c.abi,
          functionName: c.functionName,
          args: c.args,
        });
        return { status: "success", result: res };
      } catch (err) {
        return { status: "failure", error: err };
      }
    });
    return await Promise.all(promises);
  }
}
