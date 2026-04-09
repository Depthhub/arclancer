import { ethers } from "hardhat";
import * as fs from "fs";

/**
 * Helper script to mint test USDC tokens
 * Usage: npx hardhat run scripts/mint-usdc.ts --network sepolia
 */
async function main() {
    console.log("💰 Minting test USDC tokens...\n");

    // Load deployment info
    const deploymentPath = "./deployments.json";
    if (!fs.existsSync(deploymentPath)) {
        console.error("❌ deployments.json not found. Please deploy contracts first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    const usdcAddress = deployment.contracts.MockUSDC;

    if (!usdcAddress) {
        console.error("❌ MockUSDC address not found in deployments.json");
        process.exit(1);
    }

    const [signer] = await ethers.getSigners();
    console.log("Minting to account:", signer.address);

    // Get MockUSDC contract
    const MockUSDC = await ethers.getContractAt("MockUSDC", usdcAddress);

    // Mint 10,000 USDC (6 decimals)
    const amount = ethers.parseUnits("10000", 6);
    console.log("Minting amount: 10,000 USDC\n");

    const tx = await MockUSDC.mint(signer.address, amount);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");

    await tx.wait();

    // Check balance
    const balance = await MockUSDC.balanceOf(signer.address);
    console.log("\n✅ Minting successful!");
    console.log("New balance:", ethers.formatUnits(balance, 6), "USDC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
