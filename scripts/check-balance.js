const hre = require("hardhat");

async function main() {
    const tokenAddress = process.env.SNAP_TOKEN_ADDRESS;
    const targetAddress = process.argv[2] || process.env.TARGET_ADDRESS;

    if (!tokenAddress) {
        throw new Error("SNAP_TOKEN_ADDRESS not found in .env");
    }

    if (!targetAddress || !hre.ethers.isAddress(targetAddress)) {
        throw new Error("Please provide a valid wallet address as an argument.");
    }

    const SnapToken = await hre.ethers.getContractAt("SnapToken", tokenAddress);
    const balance = await SnapToken.balanceOf(targetAddress);
    const symbol = await SnapToken.symbol();

    console.log(`Balance of ${targetAddress}:`);
    console.log(`${hre.ethers.formatEther(balance)} ${symbol}`);
}

main().catch((error) => {
    console.error("Error:", error.message);
    process.exitCode = 1;
});
