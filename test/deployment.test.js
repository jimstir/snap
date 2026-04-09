const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNAP System: Deployment", function () {
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
    identity = await Identity.connect(issuer).deploy(issuer.address, snapReserve.target);
    await identity.waitForDeployment();
    Usage = await ethers.getContractFactory("Usage");
    usage = await Usage.connect(issuer).deploy(identity.target, snapReserve.target, issuer.address, snapToken.target);
    await usage.waitForDeployment();
  });

  it("should deploy all contracts and set initial state", async function () {
    // SnapToken mints initialSupply * 10**decimals()
    // ethers.parseEther returns a bigint, so multiply by 1e18 for decimals
    const expectedSupply = BigInt("1000000") * BigInt("1000000000000000000") * BigInt("1000000000000000000");
    expect(await snapToken.totalSupply()).to.equal(expectedSupply);
    expect(await snapReserve.reserveToken()).to.equal(snapToken.target);
    expect(await identity.hasRole(await identity.DEFAULT_ADMIN_ROLE(), issuer.address)).to.be.true;
    expect(await usage.identity()).to.equal(identity.target);
    expect(await usage.reserve()).to.equal(snapReserve.target);
  });
});