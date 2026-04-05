interface ISnapReserve {
    function proposalCheck() external view returns (uint256);
    function proposalWithdraw(
        uint256 assets,
        address receiver,
        address owner,
        uint256 proposal
    ) external returns (uint256);
}
