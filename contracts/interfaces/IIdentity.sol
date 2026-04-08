// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IIdentity {
    struct Preferences {
        address[] approvedMerchants;
        uint256 approvedAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 timeLimit;
        bool isBlocked;
    }
    function RECIPIENT_ROLE() external view returns (bytes32);
    function MERCHANT_ROLE() external view returns (bytes32);
    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);
    function getRecipientPreferences(
        address wallet
    ) external view returns (Preferences memory);
}
