const hre = require("hardhat");

async function main() {
    const [sender] = await hre.ethers.getSigners();
    const address2 = process.env.ADDRESS2;
    const tokenAddress = process.env.SNAP_TOKEN_ADDRESS;

    if (!tokenAddress) {
        throw new Error("SNAP_TOKEN_ADDRESS not found in .env");
    }

    const SnapToken = await hre.ethers.getContractAt("SnapToken", tokenAddress);
    const amount = hre.ethers.parseEther("1000"); // 1000 SNAP

    console.log(`Transferring ${hre.ethers.formatEther(amount)} SNAP from ${sender.address} to ${address2}...`);
    const tx = await SnapToken.transfer(address2, amount);
    await tx.wait();

    console.log("Transfer successful!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
