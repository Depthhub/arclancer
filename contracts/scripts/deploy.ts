import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * ArcLancer Deployment Script — Arc Testnet
 *
 * Uses official Arc Testnet contract addresses:
 *   USDC:     0x3600000000000000000000000000000000000000
 *   StableFX: 0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1
 *
 * Only deploys the EscrowFactory contract.
 *
 * Fund your wallet: https://faucet.circle.com
 * Docs: https://docs.arc.network/arc/references/contract-addresses
 */

// Official Arc Testnet addresses
const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
const ARC_TESTNET_STABLEFX = "0x1f91886C7028986aD885ffCee0e40b75C9cd5aC1";

async function main() {
    console.log("🚀 Deploying ArcLancer to Arc Testnet...\n");

    const [deployer] = await ethers.getSigners();
    if (!deployer) {
        throw new Error(
            "No deployer account found. Check PRIVATE_KEY in your .env file."
        );
    }

    console.log("Deployer:  ", deployer.address);
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:   ", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        console.error("\n❌ Wallet has no ETH. Get testnet ETH from https://faucet.circle.com");
        process.exit(1);
    }

    const network = await ethers.provider.getNetwork();
    console.log("Network:   ", network.name, `(chainId: ${network.chainId})\n`);

    // ============ Deploy EscrowFactory ============
    console.log("📦 Deploying EscrowFactory...");
    console.log("   USDC:      ", ARC_TESTNET_USDC);
    console.log("   StableFX:  ", ARC_TESTNET_STABLEFX);

    const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
    console.log("   Fee Collector:", feeCollector);
    console.log("   Admin:     ", deployer.address);

    const EscrowFactory = await ethers.getContractFactory("EscrowFactory");
    const factory = await EscrowFactory.deploy(
        ARC_TESTNET_USDC,
        ARC_TESTNET_STABLEFX,
        feeCollector,
        deployer.address
    );

    console.log("   Tx hash:   ", factory.deploymentTransaction()?.hash);
    console.log("   Waiting for confirmation...");

    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    console.log("✅ EscrowFactory deployed to:", factoryAddress);

    // ============ Deploy AgentRegistry ============
    console.log("\n📦 Deploying AgentRegistry...");
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    const registry = await AgentRegistry.deploy();
    await registry.waitForDeployment();
    const registryAddress = await registry.getAddress();
    console.log("✅ AgentRegistry deployed to:", registryAddress);

    // ============ Save Deployment Info ============
    const deployment = {
        network: network.name,
        chainId: Number(network.chainId),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            USDC: ARC_TESTNET_USDC + " (official Arc Testnet)",
            StableFX: ARC_TESTNET_STABLEFX + " (official Arc Testnet)",
            EscrowFactory: factoryAddress,
            AgentRegistry: registryAddress,
        },
        configuration: {
            platformFee: "200 basis points (2%)",
            feeCollector: feeCollector,
        },
    };

    const deploymentPath = "./deployments.json";
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("\n📄 Deployment saved to:", deploymentPath);

    // ============ Summary ============
    console.log("\n" + "=".repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("  USDC (official):    ", ARC_TESTNET_USDC);
    console.log("  StableFX (official):", ARC_TESTNET_STABLEFX);
    console.log("  EscrowFactory:      ", factoryAddress);
    console.log("  AgentRegistry:      ", registryAddress);
    console.log("\nConfiguration:");
    console.log("  Platform Fee:  2%");
    console.log("  Fee Collector: ", feeCollector);

    // ============ Frontend .env update instructions ============
    console.log("\n" + "=".repeat(60));
    console.log("📋 UPDATE YOUR FRONTEND .env.local:");
    console.log("=".repeat(60));
    console.log(`\nNEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
    console.log(`NEXT_PUBLIC_REGISTRY_ADDRESS=${registryAddress}`);
    console.log("\nExplorer: https://testnet.arcscan.app/address/" + factoryAddress);
    console.log("=".repeat(60));

    return deployment;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error.message || error);
        process.exit(1);
    });
