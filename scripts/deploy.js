const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured");
  const metadataBaseUri = process.env.NFT_METADATA_BASE_URI?.replace(/\/$/, "");
  if (!metadataBaseUri || !/^(https:\/\/|ipfs:\/\/).+/.test(metadataBaseUri)) {
    throw new Error("Set NFT_METADATA_BASE_URI to the public metadata directory before deployment");
  }

  console.log(`Deploying to ${network.name} from ${deployer.address}`);

  const token = await (await ethers.getContractFactory("ProjectToken")).deploy();
  await token.waitForDeployment();

  const curve = await (await ethers.getContractFactory("BondingCurve")).deploy(token);
  await curve.waitForDeployment();
  await (await token.setMinter(curve)).wait();

  const cards = await (await ethers.getContractFactory("CardNFT")).deploy(
    `${metadataBaseUri}/{id}.json`
  );
  await cards.waitForDeployment();

  const pack = await (await ethers.getContractFactory("MysteryPack")).deploy(
    token,
    cards,
    deployer.address
  );
  await pack.waitForDeployment();
  await (await cards.setPackContract(pack)).wait();

  const marketplace = await (await ethers.getContractFactory("NFTMarketplace")).deploy(cards);
  await marketplace.waitForDeployment();
  const staking = await (await ethers.getContractFactory("NFTStaking")).deploy(token, cards);
  await staking.waitForDeployment();

  const addresses = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    token: await token.getAddress(),
    bondingCurve: await curve.getAddress(),
    cardNFT: await cards.getAddress(),
    mysteryPack: await pack.getAddress(),
    marketplace: await marketplace.getAddress(),
    staking: await staking.getAddress(),
  };

  fs.mkdirSync(path.join(__dirname, "..", "deployments"), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, "..", "deployments", `${network.name}.json`),
    JSON.stringify(addresses, null, 2)
  );
  console.log(addresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
