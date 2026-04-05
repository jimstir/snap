// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;
/// @title Tokenized Treasury(ERC7425)
/// @author @jimstir

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISnapToken.sol";

contract SnapReserve is ERC4626 {
    using SafeERC20 for IERC20;

    /// @dev proposalOpen event
    event proposalO(
        address indexed token,
        uint256 indexed proposalNum,
        uint256 indexed amount,
        address recipient
    );
    /// dev proposlClose event
    event proposalC(
        uint256 indexed proposalNum,
        bool indexed closed,
        address closer
    );
    /// Deposit to proposal made
    /// dev proposlClose event
    event DepositMade(
        uint256 indexed proposalNum,
        uint256 amount,
        address depositor
    );

    // @dev deposit event
    event FundsAdded(
        address indexed token,
        uint256 indexed amount,
        uint256 indexed time,
        address sender
    );
    
    struct userAccount {
        uint256 proposal;
        uint256 deposit;
        uint256 withdrew;
    }

    struct proposalAccount {
        uint256 depositNum; // SHOULD be amount expected to be deposited
        address policy; // the identity policy for this proposal
        IERC20 token; // token being deposited
        uint256 time; // time of proposalOpen
        uint256 withdraw; // amount to be withdrawn (added for getProposalInfo)
        address receiver; // receiver address (added for getProposalInfo)
    }

    struct UserDeposit {
        uint256 amount;
        IERC20 token;
        address owner; // address of contract or wallet
        uint256 time; // time of deposit
        uint256 proposalNum;
        uint256 num;
    }

    address private _tOwner;
    //number of opened proposals
    uint256 private _proposalNum;
    uint256 private _depositNum;
    address private _identityAddr;
    address private _usageAddr;

    address private _reserve;
    IERC20 private _snapToken;

    mapping(address => bool) private _authUsers;
    mapping(uint256 => uint256) private _totalShares;
    mapping(uint256 => bool) private _closedProposals;

    //Track the number of proposals a shareholder has voted in
    mapping(address => mapping(uint256 => userAccount)) internal userBook;
    // proposal Accounting
    mapping(uint256 => proposalAccount) internal proposalBook;

    //Record deposits for reference
    mapping(uint256 => UserDeposit) internal addFunds;
    

    bool private _allowInternal = false;

    constructor(
        IERC20 token,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) ERC4626(token) {
        _tOwner = msg.sender;
        _snapToken = token;
    }

    /** @dev Primary authorized user modifier */
    modifier auth() {
        require(msg.sender == _tOwner || _authUsers[msg.sender], "Not owner");
        _;
    }

    /** @dev Get the reserve token address
     *
     */
    function reserveToken() public view returns (address) {
        return address(_snapToken);
    }

    /**
     * @dev Get the reserve owner
     *
     */
    function whosOwner() public view returns (address) {
        return _tOwner;
    }

    /** @dev Check current total number of opened proposals
     * @return uint256
     */
    function proposalCheck() public view returns (uint256) {
        return _proposalNum;
    }

    /** @dev Authorized users of the reserve
     */
    function getAuth(address user) public view returns (bool) {
        return _authUsers[user];
    }

    /** @dev Amount deposited for shareToken by user
     * - MUST be an ERC20 address
     * @param user address of user
     * @param proposal number of the proposal the user deposited
     */
    function userDeposit(
        address user,
        uint256 proposal
    ) public view returns (uint256) {
        return userBook[user][proposal].deposit;
    }

    /** @dev Amount withdrawn from given proposal by the user
     * @param user address of user
     * @param proposal number of the proposal the user withdrew
     */
    function userWithdrew(
        address user,
        uint256 proposal
    ) public view returns (uint256) {
        return userBook[user][proposal].withdrew;
    }

    /** @dev The total number of proposals joined by the user
     * @param user address of user
     */
    function userNumOfProposal(address user) public view returns (uint256) {
        return userBook[user][0].proposal;
    }

    /** @dev The proposal number from the specific proposal joined by the user
     * @param user address of user
     * @param proposal the number the user was apart of
     * MUST NOT be zero
     */
    function userProposal(
        address user,
        uint256 proposal
    ) public view returns (uint256) {
        return userBook[user][proposal].proposal;
    }
    /** Get proposal infor
     * @param proposal Proposal number
     * @return token Token address
     * @return withdrawAmount Amount withdrawn
     * @return receiver Receiver address
     */
    function getProposalInfo(
        uint256 proposal
    )
        external
        view
        returns (address token, uint256 withdrawAmount, address receiver)
    {
        proposalAccount memory p = proposalBook[proposal];
        return (address(p.token), p.withdraw, p.receiver);
    }

    /** @dev Total shares issued for a given proposal
     * NOTE: Number does not change after proposal closed and shares are redeemed
     */
    function totalShares(uint256 proposal) public view returns (uint256) {
        return _totalShares[proposal];
    }

    /** @dev Check if proposal is closed
     * @return true if closed
     */
    function closedProposal(uint256 proposal) public view returns (bool) {
        return _closedProposals[proposal];
    }
    // View identity contract address
    function getIdentityAddress() public view returns(address){
        return _identityAddr;
    }
    // View usuage contract address
    function getUsageAddress() public view returns(address){
        return _usageAddr;
    }
    /**
     * @dev SafeAdd function
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
    }
    //add the identity contract address
    function addIdentityAddr(address id) external auth{
        _identityAddr = id;
    }

    //add the usuage contract address
    function addUsuageAddr(address id) external auth{
        _usageAddr = id;
    }

    /** @dev Make a deposit to proposal creating new shares
     * - MUST be open proposal
     * - MUST NOT be a proposal that was previously closed
     * @param assets amount being deposited
     * @param proposal number of the proposal
     */
    function proposalDeposit(
        uint256 assets,
        address receiver,
        uint256 proposal
    ) external virtual {
        require(!closedProposal(proposal), "Proposal is closed");
        require(proposalCheck() >= proposal, "Invalid proposal number");

        _allowInternal = true;
        uint256 shares = super.deposit(assets, receiver);
        _allowInternal = false;
        _totalShares[proposal] = add(totalShares(proposal), shares);
        uint256 cc = userNumOfProposal(msg.sender) + 1;
        userBook[msg.sender][proposal].deposit = add(
            userDeposit(receiver, proposal),
            shares
        );

        userBook[msg.sender][0].proposal = cc;
        userBook[msg.sender][cc].proposal = proposal;
        emit DepositMade(proposal, assets, msg.sender);
    }

    /** @dev Make a deposit to proposal creating new shares
     * - MUST have proposalNumber
     * NOTE: using the proposalMint() will cause shares to not be accounted for in a proposal
     * @param shares amount being deposited
     * @param proposal the number to open proposal
     */
    function proposalMint(uint256 shares, uint256 proposal) external virtual {
        require(!closedProposal(proposal), "Proposal closed");
        require(proposalCheck() <= proposal, "Invalid proposal");

        _allowInternal = true;
        uint256 assets = super.mint(shares, msg.sender);
        _allowInternal = false;
        _totalShares[proposal] = add(totalShares(proposal), assets);
        uint256 cc = userNumOfProposal(msg.sender) + 1;
        userBook[msg.sender][proposal].deposit = add(
            userDeposit(msg.sender, proposal),
            assets
        );

        userBook[msg.sender][0].proposal = cc;
        userBook[msg.sender][cc].proposal = proposal;

        emit DepositMade(proposal, assets, msg.sender);
    }

    /** @dev Burn shares, receive 1 to 1 value of assets
     * - MUST be a closed proposalNumber
     * - MUST NOT have a userDeposit amount less than or equal to userWithdrew amount
     * @param assets amount of shares being returned
     * @param receiver address of depositor
     * @param owner the address to receive the treasury token
     * @param proposal the number to closed proposal
     */
    function proposalWithdraw(
        uint256 assets,
        address receiver,
        address owner,
        uint256 proposal
    ) external virtual returns (uint256) {
        // Only allow withdrawal if the proposal is open (not closed)
        require(!closedProposal(proposal), "Proposal is closed");
        require(
            userDeposit(receiver, proposal) >= assets,
            "Invalid withdraw amount for proposal"
        );

        _allowInternal = true;
        uint256 shares = super.withdraw(assets, receiver, owner);
        _allowInternal = false;
        userBook[receiver][proposal].withdrew = add(
            userWithdrew(receiver, proposal),
            shares
        );

        return shares;
    }

    /** @dev Burn shares, receive 1 to 1 value of shares
     * - MUST have open proposal number
     * - MUST have userDeposit less than or equal to userWithdrawal
     * NOTE: using ERC 4626 redeem() will not account for proposalWithdrawal
     */
    function proposalRedeem(
        uint256 shares,
        address receiver,
        address owner,
        uint256 proposal
    ) external virtual returns (uint256) {
        require(closedProposal(proposal), "Proposal not closed");
        require(
            userWithdrew(receiver, proposal) <= userDeposit(receiver, proposal),
            "Invalid redeem amount for proposal"
        );

        _allowInternal = true;
        uint256 assets = super.redeem(shares, receiver, owner);
        _allowInternal = false;
        userBook[receiver][proposal].withdrew = add(
            userWithdrew(receiver, proposal),
            assets
        );

        return assets;
    }
    /** @dev Issue new proposal
     * - MUST create new proposal number
     * - MUST account for amount to be withdrawn
     * @param amount token amount being withdrawn
     * @param policy the policy address
     * @param token the token address
     * 
     */
    function proposalOpen(
        uint256 amount,
        address policy,
        IERC20 token
    ) external virtual auth returns (uint256) {
        uint256 num = proposalCheck() + 1;
        proposalBook[num].token = token;
        proposalBook[num].withdraw = amount;
        proposalBook[num].policy = policy;
        _proposalNum = num;

        emit proposalO(address(token), num, amount, policy);
        return (num);
    }
    /** @dev Close an opened proposal
     * - MUST account for amount received
     * - MUST proposal must be greater than current proposal
     * @param proposal number of desired proposal to close
     */
    function proposalClose(uint256 proposal) external virtual auth returns (bool) {
        require(proposalCheck() >= proposal, "Invalid proposal");
        require(!closedProposal(proposal), "Already closed");

        _closedProposals[proposal] = true;

        emit proposalC(proposal, true, msg.sender);
        return true;
    }
    /** @dev Funds being deposited to reserve
     * - SHOULD be by owner
     * - MUST
     */
    function depositReserve(
        IERC20 token,
        uint256 amount,
        address sender
    ) external virtual returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        
        _depositNum = _depositNum + 1;
        UserDeposit storage deposits = addFunds[_depositNum];
        
        deposits.num = _depositNum;
        deposits.amount = amount;
        deposits.token = token;
        deposits.time = block.timestamp;
        deposits.owner = sender;

        SafeERC20.safeTransferFrom(token, sender, address(this), amount);
        emit FundsAdded(address(token), amount, block.timestamp, sender);
        return true;
    }

    function deposit(
        uint256 assets,
        address receiver
    ) public override returns (uint256) {
        require(
            _allowInternal,
            "Direct deposit not allowed, use proposalDeposit"
        );
        return super.deposit(assets, receiver);
    }

    function mint(
        uint256 shares,
        address receiver
    ) public override returns (uint256) {
        require(_allowInternal, "Direct mint not allowed, use proposalMint");
        return super.mint(shares, receiver);
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public override returns (uint256) {
        require(
            _allowInternal,
            "Direct redeem not allowed, use proposalRedeem"
        );
        return super.redeem(shares, receiver, owner);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override returns (uint256) {
        require(
            _allowInternal,
            "Direct withdraw not allowed, use proposalWithdraw"
        );
        return super.withdraw(assets, receiver, owner);
    }
}
