const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const initialSupply = 1000000; // 1 million SNAP
    const SnapToken = await hre.ethers.getContractFactory("SnapToken");
    const snapToken = await SnapToken.deploy(initialSupply);

    await snapToken.waitForDeployment();

    console.log("SnapToken deployed to:", await snapToken.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
