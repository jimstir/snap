const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy SnapToken
    const initialSupply = 1000000; // 1 million SNAP
    const SnapToken = await hre.ethers.getContractFactory("SnapToken");
    const snapToken = await SnapToken.deploy(initialSupply);
    await snapToken.waitForDeployment();
    const snapTokenAddress = await snapToken.getAddress();
    console.log("SnapToken deployed to:", snapTokenAddress);

    // Deploy SnapReserve with SnapToken address
    const SnapReserve = await hre.ethers.getContractFactory("SnapReserve");
    // Example params: name, symbol
    const reserveName = "SnapReserve";
    const reserveSymbol = "SNAPR";
    const snapReserve = await SnapReserve.deploy(snapTokenAddress, reserveName, reserveSymbol);
    await snapReserve.waitForDeployment();
    const snapReserveAddress = await snapReserve.getAddress();
    console.log("SnapReserve deployed to:", snapReserveAddress);

    // Deploy Identity
    const Identity = await hre.ethers.getContractFactory("Identity");
    const identity = await Identity.deploy();
    await identity.waitForDeployment();
    const identityAddress = await identity.getAddress();
    console.log("Identity deployed to:", identityAddress);

    // Deploy Usage with Identity and SnapReserve addresses
    const Usage = await hre.ethers.getContractFactory("Usage");
    const usage = await Usage.deploy(identityAddress, snapReserveAddress);
    await usage.waitForDeployment();
    const usageAddress = await usage.getAddress();
    console.log("Usage deployed to:", usageAddress);

    // Update .env file with deployed addresses
    const envPath = ".env";
    let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    function setEnv(key, value) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (env.match(regex)) {
            env = env.replace(regex, `${key}=${value}`);
        } else {
            env += `\n${key}=${value}`;
        }
    }
    setEnv("SNAP_TOKEN_ADDRESS", snapTokenAddress);
    setEnv("SNAP_RESERVE_ADDRESS", snapReserveAddress);
    setEnv("IDENTITY_ADDRESS", identityAddress);
    setEnv("USAGE_ADDRESS", usageAddress);
    fs.writeFileSync(envPath, env);
    console.log(".env updated with contract addresses.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});