const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured");

  console.log(`Deploying to ${network.name} from ${deployer.address}`);

  const token = await (await ethers.getContractFactory("ProjectToken")).deploy();
  await token.waitForDeployment();

  const curve = await (await ethers.getContractFactory("BondingCurve")).deploy(token);
  await curve.waitForDeployment();
  await (await token.setMinter(curve)).wait();

  const cards = await (await ethers.getContractFactory("CardNFT")).deploy(
    "ipfs://REPLACE_WITH_METADATA_CID/{id}.json"
  );
  await cards.waitForDeployment();

  const pack = await (await ethers.getContractFactory("MysteryPack")).deploy(
    token,
    cards,
    deployer.address
  );
  await pack.waitForDeployment();
  await (await cards.setPackContract(pack)).wait();

  const addresses = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    token: await token.getAddress(),
    bondingCurve: await curve.getAddress(),
    cardNFT: await cards.getAddress(),
    mysteryPack: await pack.getAddress(),
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
