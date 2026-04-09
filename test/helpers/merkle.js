const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');


// leaves: array of Buffers (already keccak256(abi.encodePacked(...)))
// targetLeaf: Buffer (already keccak256(abi.encodePacked(...)))
function generateMerkleProof(leaves, targetLeaf) {
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const proof = tree.getHexProof(targetLeaf);
  const root = tree.getHexRoot();
  return { proof, root };
}

module.exports = { generateMerkleProof };
