// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISnapReserve {
    function proposalCheck() external view returns (uint256);
    function proposalWithdraw(
        uint256 assets,
        address receiver,
        address owner,
        uint256 proposal
    ) external returns (uint256);
    function getProposalInfo(uint256 proposal)
        external
        view
        returns (address token, uint256 withdrawAmount, address receiver);
    function balanceOf(address account) external view returns (uint256);
}
