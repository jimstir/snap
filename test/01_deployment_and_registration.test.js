const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNAP System: Deployment & Registration", function () {
  let deployer, issuer, recipient, merchant, other;
  let SnapToken, SnapReserve, Identity, Usage;
  let snapToken, snapReserve, identity, usage;


  beforeEach(async function () {
    [deployer, issuer, recipient, merchant, other] = await ethers.getSigners();

    // Deploy SnapToken
    SnapToken = await ethers.getContractFactory("SnapToken");
    snapToken = await SnapToken.connect(issuer).deploy(ethers.parseEther("1000000"));
    await snapToken.waitForDeployment();
    console.log("SnapToken deployed at:", snapToken.target);

    // Deploy SnapReserve
    SnapReserve = await ethers.getContractFactory("SnapReserve");
    snapReserve = await SnapReserve.connect(issuer).deploy(
      snapToken.target,
      "SnapReserve",
      "SNAPR"
    );
    await snapReserve.waitForDeployment();
    console.log("SnapReserve deployed at:", snapReserve.target);

    // Deploy Identity
    Identity = await ethers.getContractFactory("Identity");
    identity = await Identity.connect(issuer).deploy(issuer.address);
    await identity.waitForDeployment();
    console.log("Identity deployed at:", identity.target);

    // Deploy Usage
    Usage = await ethers.getContractFactory("Usage");
    usage = await Usage.connect(issuer).deploy(identity.target, snapReserve.target, issuer.address);
    await usage.waitForDeployment();
    console.log("Usage deployed at:", usage.target);
  });


  it("should deploy all contracts and assign initial roles", async function () {
    const tokenName = await snapToken.name();
    const reserveName = await snapReserve.name();
    const isIssuer = await identity.hasRole(await identity.ISSUER_ROLE(), issuer.address);
    console.log("SnapToken name:", tokenName);
    console.log("SnapReserve name:", reserveName);
    console.log("Issuer has ISSUER_ROLE:", isIssuer);
    expect(tokenName).to.equal("SnapToken");
    expect(reserveName).to.equal("SnapReserve");
    expect(isIssuer).to.be.true;
  });


  it("should allow recipient and merchant registration", async function () {
    // Simulate recipient registration
    const recTx = await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    await recTx.wait();
    console.log("Recipient registered:", recipient.address);
    // Simulate merchant registration
    const merTx = await identity.connect(issuer).grantRole(await identity.MERCHANT_ROLE(), merchant.address);
    await merTx.wait();
    console.log("Merchant registered:", merchant.address);
    const isRec = await identity.hasRole(await identity.RECIPIENT_ROLE(), recipient.address);
    const isMer = await identity.hasRole(await identity.MERCHANT_ROLE(), merchant.address);
    console.log("Recipient has RECIPIENT_ROLE:", isRec);
    console.log("Merchant has MERCHANT_ROLE:", isMer);
    expect(isRec).to.be.true;
    expect(isMer).to.be.true;
  });


  it("should not allow duplicate recipient registration", async function () {
    await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    console.log("First registration for recipient done.");
    await expect(
      identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address)
    ).to.be.reverted;
    console.log("Duplicate registration reverted as expected.");
  });
});
