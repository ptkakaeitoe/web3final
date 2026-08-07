const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured");

  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}.json`
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Missing deployment file: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  if (!deployment.token || !deployment.bondingCurve) {
    throw new Error("Existing token and bonding curve addresses are required");
  }

  const metadataBaseUri = process.env.NFT_METADATA_BASE_URI?.replace(/\/$/, "");
  if (!metadataBaseUri || !/^(https:\/\/|ipfs:\/\/).+/.test(metadataBaseUri)) {
    throw new Error("Set NFT_METADATA_BASE_URI before deployment");
  }

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  if (chainId !== deployment.chainId) {
    throw new Error(`Deployment file is for chain ${deployment.chainId}, connected to ${chainId}`);
  }
  if ((await ethers.provider.getCode(deployment.token)) === "0x") {
    throw new Error("Existing MYST token has no deployed bytecode");
  }

  console.log(`Replacing NFT suite on ${network.name} from ${deployer.address}`);
  console.log(`Preserving MYST token ${deployment.token}`);
  console.log(`Preserving bonding curve ${deployment.bondingCurve}`);

  const cards = await (await ethers.getContractFactory("CardNFT")).deploy(
    `${metadataBaseUri}/{id}.json`
  );
  await cards.waitForDeployment();

  const pack = await (await ethers.getContractFactory("MysteryPack")).deploy(
    deployment.token,
    cards,
    deployer.address
  );
  await pack.waitForDeployment();
  await (await cards.setPackContract(pack)).wait();

  const marketplace = await (
    await ethers.getContractFactory("NFTMarketplace")
  ).deploy(cards);
  await marketplace.waitForDeployment();

  const staking = await (
    await ethers.getContractFactory("NFTStaking")
  ).deploy(deployment.token, cards);
  await staking.waitForDeployment();

  const previous = {
    replacedAt: new Date().toISOString(),
    cardNFT: deployment.cardNFT,
    mysteryPack: deployment.mysteryPack,
    marketplace: deployment.marketplace,
    staking: deployment.staking,
  };

  deployment.previousNftSuites = [
    ...(deployment.previousNftSuites || []),
    previous,
  ];
  deployment.deployer = deployer.address;
  deployment.cardNFT = await cards.getAddress();
  deployment.mysteryPack = await pack.getAddress();
  deployment.marketplace = await marketplace.getAddress();
  deployment.staking = await staking.getAddress();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log({
    token: deployment.token,
    bondingCurve: deployment.bondingCurve,
    cardNFT: deployment.cardNFT,
    mysteryPack: deployment.mysteryPack,
    marketplace: deployment.marketplace,
    staking: deployment.staking,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
