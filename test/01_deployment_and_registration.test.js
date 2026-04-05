const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNAP System: Deployment & Registration", function () {
  let deployer, issuer, recipient, merchant, other;
  let SnapToken, SnapReserve, Identity, Usage;
  let snapToken, snapReserve, identity, usage;

  beforeEach(async function () {
    [deployer, issuer, recipient, merchant, other] = await ethers.getSigners();
    SnapToken = await ethers.getContractFactory("SnapToken");
    snapToken = await SnapToken.connect(issuer).deploy(ethers.parseEther("1000000"));
    await snapToken.waitForDeployment();
    SnapReserve = await ethers.getContractFactory("SnapReserve");
    snapReserve = await SnapReserve.connect(issuer).deploy(
      snapToken.target,
      "SnapReserve",
      "SNAPR"
    );
    await snapReserve.waitForDeployment();
    Identity = await ethers.getContractFactory("Identity");
    identity = await Identity.connect(issuer).deploy(issuer.address);
    await identity.waitForDeployment();
    Usage = await ethers.getContractFactory("Usage");
    usage = await Usage.connect(issuer).deploy(identity.target, snapReserve.target, issuer.address);
    await usage.waitForDeployment();
  });

  it("should deploy all contracts and set initial state", async function () {
    expect(await snapToken.totalSupply()).to.equal(ethers.parseEther("1000000"));
    expect(await snapReserve.reserveToken()).to.equal(snapToken.target);
    expect(await identity.hasRole(await identity.DEFAULT_ADMIN_ROLE(), issuer.address)).to.be.true;
    expect(await usage.identity()).to.equal(identity.target);
    expect(await usage.reserve()).to.equal(snapReserve.target);
  });

  it("should allow issuer to register recipient and merchant", async function () {
    await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    await identity.connect(issuer).grantRole(await identity.MERCHANT_ROLE(), merchant.address);
    expect(await identity.hasRole(await identity.RECIPIENT_ROLE(), recipient.address)).to.be.true;
    expect(await identity.hasRole(await identity.MERCHANT_ROLE(), merchant.address)).to.be.true;
  });

  it("should prevent double registration of recipient", async function () {
    await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    await expect(
      identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address)
    ).to.be.revertedWith("AccessControl: account already has role");
  });
});
