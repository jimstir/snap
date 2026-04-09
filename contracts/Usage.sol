// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IIdentity.sol";
import "./interfaces/ISnapReserve.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ISnapToken.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Usage
 * @dev Records interactions between recipients and merchants
 */
contract Usage is Ownable {
    using SafeERC20 for IERC20;
        
    event PaymentProcessed(
        uint256 indexed transactionId,
        address indexed recipient,
        address indexed merchant,
        uint256 amount
    );

    IIdentity public identity;
    ISnapReserve public reserve;
    IERC20 private _token;
    address private _owner;

    struct TransactionRecord {
        address recipient;
        address merchant;
        uint256 amount;
        uint256 timestamp;
        uint256 proposal;
    }
    mapping(uint256 => TransactionRecord) public transactions;
    uint256 public transactionCount;
    mapping(address => uint256) public lastTransactionTime;
    
    constructor(
        address _identity,
        address _reserve,
        address owner,
        IERC20 token
    ) Ownable(msg.sender) {
        identity = IIdentity(_identity);
        reserve = ISnapReserve(_reserve);
        _owner = owner;
        _token = token;
    }

    // check the reserve address
    function checkReserve() external view returns(ISnapReserve){
        return(reserve);
    }

    function depositToProposal(uint256 amount, uint256 proposalNum) external onlyOwner {
        require(amount > 0, "Amount must be > 0");

        uint256 bal = _token.balanceOf(address(this));
        if (bal < amount) {
            uint256 shortfall = amount - bal;
            _token.safeTransferFrom(_owner, address(this), shortfall);
        }

        _token.forceApprove(address(reserve), amount);
        reserve.proposalDeposit(amount, address(this), proposalNum);
    }
    

    /**
     * @dev Internal check for recipient-defined access controls.
     * Future could record preference failers on-chain
     */
    function _checkPreferences(
        address recipient,
        address merchant,
        uint256 amount
    ) internal view {
        IIdentity.Preferences memory prefs = identity.getRecipientPreferences(
            recipient
        );

        // check isBlocked
        require(!prefs.isBlocked, "Account is blocked");

        // check approvedMerchants (if set to non-empty)
        if (prefs.approvedMerchants.length > 0) {
            bool merchantApproved = false;
            for (uint256 i = 0; i < prefs.approvedMerchants.length; i++) {
                if (prefs.approvedMerchants[i] == merchant) {
                    merchantApproved = true;
                    break;
                }
            }
            require(merchantApproved, "Merchant not approved by recipient");
        }

        // check approvedAmount (if set to non-zero)
        if (prefs.approvedAmount > 0) {
            require(
                amount <= prefs.approvedAmount,
                "Amount exceeds recipient limit per txns"
            );
        }

        // check time of day (startTime/endTime as 0-23 index)
        if (prefs.startTime != 0 || prefs.endTime != 0) {
            uint256 currentHour = (block.timestamp / 3600) % 24;
            // Handle cross-day ranges (e.g. 23 to 01)
            if (prefs.startTime < prefs.endTime) {
                require(
                    currentHour >= prefs.startTime &&
                        currentHour < prefs.endTime,
                    "Outside approved hours"
                );
            } else if (prefs.startTime > prefs.endTime) {
                require(
                    currentHour >= prefs.startTime ||
                        currentHour < prefs.endTime,
                    "Outside approved hours"
                );
            }
        }

        // check timeLimit (cooldown)
        if (prefs.timeLimit > 0) {
            require(
                block.timestamp >=
                    lastTransactionTime[recipient] + prefs.timeLimit,
                "Cooldown period active"
            );
        }
    }

    /**
     * @dev Process a payment after verifying recipient preferences.
     * @param recipient The address of the recipient role.
     * @param merchant The address of the merchant role.
     * @param amount The amount to be sent.
     */
    function pay(
        address recipient,
        address merchant,
        uint256 amount
    ) external onlyOwner {
        // 1. Verify identities
        require(
            identity.hasRole(identity.RECIPIENT_ROLE(), recipient),
            "Not a recipient"
        );
        require(
            identity.hasRole(identity.MERCHANT_ROLE(), merchant),
            "Not a merchant"
        );
        
        _checkPreferences(recipient, merchant, amount);
        uint256 proposalNum = reserve.proposalCheck();
        
        transactionCount++;
        lastTransactionTime[recipient] = block.timestamp;
        transactions[transactionCount] = TransactionRecord({
            recipient: recipient,
            merchant: merchant,
            amount: amount,
            timestamp: block.timestamp,
            proposal: proposalNum
        });
        // 4. Call SnapReserve for payment
        reserve.proposalWithdraw(amount, address(this), address(this), proposalNum);
        emit PaymentProcessed(transactionCount, recipient, merchant, amount);
    }
}
