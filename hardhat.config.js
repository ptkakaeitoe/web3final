require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;
const defaultSepoliaRpc = "https://ethereum-sepolia-rpc.publicnode.com";

function getSepoliaRpcUrl() {
  if (!SEPOLIA_RPC_URL) return defaultSepoliaRpc;

  let parsed;
  try {
    parsed = new URL(SEPOLIA_RPC_URL);
  } catch {
    throw new Error("SEPOLIA_RPC_URL must be a complete http(s) JSON-RPC URL.");
  }

  if (parsed.hostname === "sepolia.etherscan.io") {
    throw new Error(
      "SEPOLIA_RPC_URL points to the Etherscan explorer, not an RPC service. " +
      "Use an Alchemy/Infura RPC URL, or remove this variable to use the public Sepolia RPC."
    );
  }
  return SEPOLIA_RPC_URL;
}

function getPrivateKey() {
  if (!PRIVATE_KEY) return undefined;
  const normalized = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("PRIVATE_KEY must contain exactly 64 hexadecimal characters.");
  }
  return normalized;
}

const privateKey = getPrivateKey();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: getSepoliaRpcUrl(),
      accounts: privateKey ? [privateKey] : [],
      chainId: 11155111,
    },
  },
};
