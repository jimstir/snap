const { ethers } = require('ethers');

async function signRegistration(signer, recipient, data) {
  // data: any extra registration data to sign
  const message = ethers.solidityPacked(['address', 'bytes'], [recipient, data]);
  const signature = await signer.signMessage(ethers.getBytes(message));
  return signature;
}

module.exports = { signRegistration };
