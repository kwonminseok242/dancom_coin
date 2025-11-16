import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🚀 Starting deployment to Sepolia...");
  console.log("🔗 RPC URL:", process.env.SEPOLIA_RPC_URL || "(missing!)");
  console.log("🔑 Private key exists?", !!process.env.PRIVATE_KEY);

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", await deployer.getAddress());
  console.log("💰 Balance:", (await deployer.provider.getBalance(await deployer.getAddress())).toString());

  const SimFiatStable = await ethers.getContractFactory("SimFiatStable");
  const contract = await SimFiatStable.deploy();
  await contract.waitForDeployment();

  console.log("✅ SimFiatStable deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
