const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNAP System: Payments & Access Controls", function () {
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
    // Register recipient and merchant
    await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    await identity.connect(issuer).grantRole(await identity.MERCHANT_ROLE(), merchant.address);
    // Set recipient preferences: approve merchant, amount, time, timeLimit
    await identity.connect(recipient).setPreferences(
      [true, true, true],
      [merchant.address],
      ethers.parseEther("100"), // approvedAmount
      0, // startTime
      23, // endTime
      60 // timeLimit (1 min)
    );
  });

  it("should allow payment if all access controls pass", async function () {
    const amount = ethers.parseEther("10");
    const tx = await snapReserve.connect(issuer).proposalOpen(
      amount,
      usage.target, // Usage contract as policy
      snapToken.target
    );
    const receipt = await tx.wait();
    // Parse proposalNum from event logs
    const event = receipt.logs
      .map(log => {
        try {
          return snapReserve.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find(e => e && e.name === "proposalO");
    const proposalNum = event.args.proposalNum;
    // 2. Fund issuer with SnapToken and approve SnapReserve
    await snapToken.connect(issuer).approve(snapReserve.target, amount);
    // 3. Deposit SnapToken into the proposal, receiver is Usage contract
    await snapReserve.connect(issuer).proposalDeposit(
      amount,
      usage.target,
      proposalNum
    );
    // 4. Simulate recipient sending payment request to issuer (off-chain)
    // 5. Issuer executes pay on Usage contract
    // Before payment, get Usage's shares for the proposal
    const usageSharesBefore = await snapReserve.balanceOf(usage.target);
    // Get withdraw amount from proposal info
    const proposalInfo = await snapReserve.getProposalInfo(proposalNum);
    const withdrawAmount = proposalInfo[1];
    // Execute payment
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, amount)
    ).to.emit(usage, "PaymentProcessed");
    // After payment, Usage contract should have less shares than withdraw amount
    const usageSharesAfter = await snapReserve.balanceOf(usage.target);
    expect(usageSharesAfter).to.be.lt(withdrawAmount);
  });

  it("should fail payment if merchant not approved", async function () {
    await identity.connect(recipient).setPreferences(
      [true, false, false],
      [other.address],
      ethers.parseEther("100"),
      0,
      23,
      60
    );
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, ethers.parseEther("10"))
    ).to.be.revertedWith("Merchant not approved by recipient");
  });

  it("should fail payment if amount exceeds approvedAmount", async function () {
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, ethers.parseEther("200"))
    ).to.be.revertedWith("Amount exceeds recipient limit");
  });

  it("should fail payment if outside approved time", async function () {
    // Set time window to 1-2 (should fail at block.timestamp hour 0)
    await identity.connect(recipient).setPreferences(
      [false, true, false],
      [],
      0,
      1,
      2,
      60
    );
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, ethers.parseEther("10"))
    ).to.be.revertedWith("Outside approved hours");
  });

  it("should fail payment if cooldown period active", async function () {
    // First payment should succeed
    await usage.connect(issuer).pay(recipient.address, merchant.address, ethers.parseEther("10"));
    // Second payment immediately should fail due to cooldown
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, ethers.parseEther("10"))
    ).to.be.revertedWith("Cooldown period active");
  });
});
