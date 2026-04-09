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
    identity = await Identity.connect(issuer).deploy(issuer.address, snapReserve.target);
    await identity.waitForDeployment();
    Usage = await ethers.getContractFactory("Usage");
    usage = await Usage.connect(issuer).deploy(identity.target, snapReserve.target, issuer.address, snapToken.target);
    await usage.waitForDeployment();
    // Register recipient and merchant
    await identity.connect(issuer).grantRole(await identity.RECIPIENT_ROLE(), recipient.address);
    await identity.connect(issuer).grantRole(await identity.MERCHANT_ROLE(), merchant.address);
    // Set recipient preferences: approve merchant, amount, time, timeLimit
    // Ensure approvedMerchants array is not empty and matches contract logic
    await identity.connect(recipient).setPreferences(
      [true, true, true],
      [merchant.address, merchant.address],
      ethers.parseEther("100"),
      0,
      23,
      60
    );
  });

  it("should allow payment if all access controls pass", async function () {
    // 1. Mint tokens and open a new proposal with usage contract as policy
    const amount = ethers.parseEther("10");
    // 2. Open proposal with usage contract as policy
    const tx = await snapReserve.connect(issuer).proposalOpen(
      amount,
      usage.target,
      snapToken.target
    );
    const receipt = await tx.wait();
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
    // 3. Deposit minted tokens into the correct proposalNum via Usage contract
    await snapToken.connect(issuer).approve(usage.target, amount);
    await usage.connect(issuer).depositToProposal(amount, proposalNum);
    // 4. Usage contract now has shares, check deposit records for debugging
    const usageSharesBefore = await snapReserve.balanceOf(usage.target);
    const usageDeposit = await snapReserve.userDeposit(usage.target, proposalNum);
      // The owner of the shares is the Usage contract, not the issuer
      const usageDeposit2 = await snapReserve.userDeposit(usage.target, proposalNum);
      console.log("Usage contract deposit (again):", usageDeposit2.toString());
    const maxWithdraw = await snapReserve.maxWithdraw(usage.target);
    console.log("Max withdraw from usage contract:", maxWithdraw.toString());
    // 5. Call pay with amount less than shares (should succeed)
    const paymentAmount = ethers.parseEther("1");
    expect(usageSharesBefore).to.be.gte(paymentAmount);
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, paymentAmount)
    ).to.emit(usage, "PaymentProcessed");
    // After payment, Usage contract should have less shares
    const usageSharesAfter = await snapReserve.balanceOf(usage.target);
    expect(usageSharesAfter).to.be.lt(usageSharesBefore);
  });

  it("should fail payment if merchant not approved", async function () {
    // 1. Mint tokens and open a new proposal with usage contract as policy
    const amount = ethers.parseEther("10");
    const tx = await snapReserve.connect(issuer).proposalOpen(
      amount,
      usage.target,
      snapToken.target
    );
    const receipt = await tx.wait();
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
    // 2. Deposit minted tokens into the correct proposalNum via Usage contract
    await snapToken.connect(issuer).approve(usage.target, amount);
    await usage.connect(issuer).depositToProposal(amount, proposalNum);
    // Grant MERCHANT_ROLE to other.address so it passes the role check
    await identity.connect(issuer).grantRole(await identity.MERCHANT_ROLE(), other.address);
    // 3. Set recipient preferences to approve only 'merchant.address'
    await identity.connect(recipient).setPreferences(
      [true, false, false],
      [merchant.address],
      ethers.parseEther("100"),
      0,
      23,
      60
    );
    // 4. Attempt payment to other.address (not in approved list)
    await expect(
      usage.connect(issuer).pay(recipient.address, other.address, amount - 1n)
    ).to.be.revertedWith("Merchant not approved by recipient");
  });

  it("should fail payment if amount exceeds approvedAmount", async function () {
    // Setup a new proposal and deposit for this test
    const amount = ethers.parseEther("200");
    const tx = await snapReserve.connect(issuer).proposalOpen(
      amount,
      usage.target,
      snapToken.target
    );
    const receipt = await tx.wait();
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
    await snapToken.connect(issuer).approve(usage.target, amount);
    await usage.connect(issuer).depositToProposal(amount, proposalNum);
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, amount)
    ).to.be.revertedWith("Amount exceeds recipient limit per txns");
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
    // 1. Mint tokens and open a new proposal with usage contract as policy
    const amount = ethers.parseEther("10");
    const doubleAmount = amount * 2n;
    const tx = await snapReserve.connect(issuer).proposalOpen(
      doubleAmount,
      usage.target,
      snapToken.target
    );
    const receipt = await tx.wait();
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
    // 2. Approve and deposit minted tokens into the correct proposalNum, receiver is Usage contract
    await snapToken.connect(issuer).approve(usage.target, doubleAmount);
    await usage.connect(issuer).depositToProposal(doubleAmount, proposalNum);
    // 3. Set recipient preferences with a short cooldown (timeLimit)
    await identity.connect(recipient).setPreferences(
      [true, true, true],
      [merchant.address, merchant.address],
      ethers.parseEther("100"),
      0,
      23,
      3600 // 1 hour cooldown
    );
    // 4. First payment should succeed with a small amount
    const paymentAmount = ethers.parseEther("1");
    await usage.connect(issuer).pay(recipient.address, merchant.address, paymentAmount);
    // 5. Second payment immediately should fail due to cooldown
    await expect(
      usage.connect(issuer).pay(recipient.address, merchant.address, paymentAmount)
    ).to.be.revertedWith("Cooldown period active");
  });
});
