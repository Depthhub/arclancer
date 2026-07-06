import type { EIP1193Provider } from "viem";

declare module "*.css";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export {};