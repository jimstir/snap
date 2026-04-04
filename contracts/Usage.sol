// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Identity.sol";

interface ISnapReserve {
    function proposalWithdraw(
        uint256 assets,
        address receiver,
        address owner,
        uint256 proposal
    ) external returns (uint256);
}

/**
 * @title Usage
 * @dev Records interactions between recipients and merchants and handles payments
 * subject to user-defined access controls.
 */
contract Usage is Ownable {
    Identity public identity;
    ISnapReserve public reserve;

    struct TransactionRecord {
        address recipient;
        address merchant;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => TransactionRecord) public transactions;
    uint256 public transactionCount;
    mapping(address => uint256) public lastTransactionTime;

    event PaymentProcessed(
        uint256 indexed transactionId,
        address indexed recipient,
        address indexed merchant,
        uint256 amount
    );

    constructor(address _identity, address _reserve) Ownable(msg.sender) {
        identity = Identity(_identity);
        reserve = ISnapReserve(_reserve);
    }

    /**
     * @dev Process a payment after verifying recipient preferences.
     * @param recipient The address of the recipient role.
     * @param merchant The address of the merchant role.
     * @param amount The amount to be sent.
     * @param proposalId The ID of the proposal to withdraw from.
     * @param reserveOwner The address of the shares owner in SnapReserve.
     */
    function pay(
        address recipient,
        address merchant,
        uint256 amount,
        uint256 proposalId,
        address reserveOwner
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

        // 2. Check preferences
        _checkPreferences(recipient, merchant, amount);

        // 3. Record transaction
        transactionCount++;
        transactions[transactionCount] = TransactionRecord({
            recipient: recipient,
            merchant: merchant,
            amount: amount,
            timestamp: block.timestamp
        });
        lastTransactionTime[recipient] = block.timestamp;

        // 4. Call SnapReserve for payment
        reserve.proposalWithdraw(amount, merchant, reserveOwner, proposalId);

        emit PaymentProcessed(transactionCount, recipient, merchant, amount);
    }

    /**
     * @dev Internal check for recipient-defined access controls.
     */
    function _checkPreferences(
        address recipient,
        address merchant,
        uint256 amount
    ) internal view {
        Identity.Preferences memory prefs = identity.getRecipientPreferences(
            recipient
        );

        // check isBlocked
        require(!prefs.isBlocked, "Account is blocked");

        // check approvedMerchant (if set to non-zero)
        if (prefs.approvedMerchant != address(0)) {
            require(
                prefs.approvedMerchant == merchant,
                "Merchant not approved by recipient"
            );
        }

        // check approvedAmount (if set to non-zero)
        if (prefs.approvedAmount > 0) {
            require(
                amount <= prefs.approvedAmount,
                "Amount exceeds recipient limit"
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
}
