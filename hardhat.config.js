require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    arc: {
      url: process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [
        process.env.PRIVATE_KEY1,
        process.env.PRIVATE_KEY2
      ].filter(Boolean).filter(k => k.length === 66 || k.length === 64),
    },
  },
};
