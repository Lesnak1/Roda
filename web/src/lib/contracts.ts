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
} as const;

export type CircleStateValue =
  (typeof CircleState)[keyof typeof CircleState];
