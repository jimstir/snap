const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateMerkleProof } = require("./helpers/merkle");
const { signRegistration } = require("./helpers/signature");

describe("SNAP System: Registration", function () {
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

  it("should allow issuer to register recipient with Merkle proof", async function () {
    const value = 100;
    // Leaves are keccak256(abi.encodePacked(address, value)) for each recipient, as Buffer
    const leaf1 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [recipient.address, value])
      ).slice(2),
      'hex'
    );
    const leaf2 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [other.address, value])
      ).slice(2),
      'hex'
    );
    const leaves = [leaf1, leaf2];
    // Use helper to generate proof and root for recipient
    const { proof, root } = generateMerkleProof(leaves, leaf1);
    await identity.connect(issuer).addRoot(root);
    await expect(
      identity.connect(recipient).registerRecipient(proof, value)
    ).to.emit(identity, "RecipientRegistered");
  });

  it("should allow issuer to register merchant with signature", async function () {
    // Simulate off-chain signature by issuer for merchant registration
    const externalId = 123;
    // The contract expects keccak256(abi.encodePacked(msg.sender, address(this)))
    // The merchant must NOT have the MERCHANT_ROLE yet, and the issuer must have ISSUER_ROLE
    // The signature must be from the issuer, for (merchant.address, identity.address)
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(["address", "address"], [merchant.address, identity.target])
    );
    const signature = await issuer.signMessage(ethers.getBytes(messageHash));
    // The merchant must not have the role yet, so do not pre-register
    await expect(
      identity.connect(merchant).registerMerchant(true, externalId, merchant.address, signature)
    ).to.emit(identity, "MerchantRegistered");
  });

  it("should allow recipient to update address with signature", async function () {
    // Simulate off-chain signature by recipient for address update
    const oldWallet = recipient.address;
    const newWallet = other.address;
    // The contract expects keccak256(abi.encodePacked(oldWallet, newWallet, address(this)))
    // First, register the recipient so they have the RECIPIENT_ROLE
    const value = 100;
    const leaf1 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [recipient.address, value])
      ).slice(2),
      'hex'
    );
    const leaf2 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [other.address, value])
      ).slice(2),
      'hex'
    );
    const leaves = [leaf1, leaf2];
    const { proof, root } = generateMerkleProof(leaves, leaf1);
    await identity.connect(issuer).addRoot(root);
    await identity.connect(recipient).registerRecipient(proof, value);
    // Now, generate the signature from the old wallet (recipient)
    // oldWallet and newWallet already defined above
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(["bytes", "address", "address"], [ethers.getBytes(recipient.address), other.address, identity.target])
    );
    const signature = await recipient.signMessage(ethers.getBytes(messageHash));
    await expect(
      identity.connect(other).updateRecipientAddress(ethers.getBytes(recipient.address), false, signature)
    ).to.emit(identity, "RecipientAddressUpdated");
  });

  it("should prevent double registration of recipient", async function () {
    const value = 100;
    const leaf1 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [recipient.address, value])
      ).slice(2),
      'hex'
    );
    const leaf2 = Buffer.from(
      ethers.keccak256(
        ethers.solidityPacked(["address", "uint256"], [other.address, value])
      ).slice(2),
      'hex'
    );
    const leaves = [leaf1, leaf2];
    const { proof, root } = generateMerkleProof(leaves, leaf1);
    await identity.connect(issuer).addRoot(root);
    await identity.connect(recipient).registerRecipient(proof, value);
    await expect(
      identity.connect(recipient).registerRecipient(proof, value)
    ).to.be.revertedWith("Already registered");
  });
});