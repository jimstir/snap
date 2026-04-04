const hre = require("hardhat");

async function main() {
    const provider = hre.ethers.provider;

    // Wallet 1 details
    const address1 = process.env.ADDRESS1;
    const balance1 = await provider.getBalance(address1);
    console.log("Wallet 1 Address:", address1);
    console.log("Wallet 1 Balance:", hre.ethers.formatEther(balance1), "USDC");

    // Wallet 2 details
    const address2 = process.env.ADDRESS2;
    const balance2 = await provider.getBalance(address2);
    console.log("Wallet 2 Address:", address2);
    console.log("Wallet 2 Balance:", hre.ethers.formatEther(balance2), "USDC");

    console.log("\nIf you see balances above (even if 0), the connection to the Arc Testnet is successful!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
