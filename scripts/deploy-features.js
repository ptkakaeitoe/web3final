const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) throw new Error(`Missing deployment file: ${deploymentPath}`);
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  if (!deployment.token || !deployment.cardNFT) throw new Error("Deployment must contain token and cardNFT addresses");

  const marketplace = await (await ethers.getContractFactory("NFTMarketplace")).deploy(deployment.cardNFT);
  await marketplace.waitForDeployment();
  const staking = await (await ethers.getContractFactory("NFTStaking")).deploy(deployment.token, deployment.cardNFT);
  await staking.waitForDeployment();

  deployment.marketplace = await marketplace.getAddress();
  deployment.staking = await staking.getAddress();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log({ marketplace: deployment.marketplace, staking: deployment.staking });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
