const fs = require("fs");
const path = require("path");
const { network, run } = require("hardhat");

async function verify(name, address, constructorArguments) {
  if (!address) throw new Error(`Missing deployment address for ${name}`);

  try {
    await run("verify:verify", { address, constructorArguments });
    console.log(`Verified ${name}: ${address}`);
  } catch (error) {
    const message = error?.message || String(error);
    if (/already verified/i.test(message)) {
      console.log(`Already verified ${name}: ${address}`);
      return;
    }
    throw new Error(`Could not verify ${name} at ${address}: ${message}`);
  }
}

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error("Set ETHERSCAN_API_KEY in .env before verifying contracts");
  }

  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}.json`
  );
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const metadataBaseUri = process.env.NFT_METADATA_BASE_URI?.replace(/\/$/, "");
  if (!metadataBaseUri) {
    throw new Error("Set NFT_METADATA_BASE_URI to the same value used for deployment");
  }

  await verify("ProjectToken", deployment.token, []);
  await verify("BondingCurve", deployment.bondingCurve, [deployment.token]);
  await verify("CardNFT", deployment.cardNFT, [`${metadataBaseUri}/{id}.json`]);
  await verify("MysteryPack", deployment.mysteryPack, [
    deployment.token,
    deployment.cardNFT,
    deployment.deployer,
  ]);
  await verify("NFTMarketplace", deployment.marketplace, [deployment.cardNFT]);
  await verify("NFTStaking", deployment.staking, [
    deployment.token,
    deployment.cardNFT,
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
