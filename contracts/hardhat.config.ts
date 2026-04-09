import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Normalize private key: ensure 0x prefix, validate length
function getAccounts(): string[] {
  const key = process.env.PRIVATE_KEY;
  if (!key || key.includes("REPLACE") || key.length < 64) return [];
  const normalized = key.startsWith("0x") ? key : `0x${key}`;
  return [normalized];
}

const accounts = getAccounts();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Arc Testnet (chain ID 5042002)
    // Docs: https://docs.arc.network/arc/references/connect-to-arc
    // Faucet: https://faucet.circle.com
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts,
    },
    // Sepolia (fallback for EVM testing)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      chainId: 11155111,
      accounts,
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
