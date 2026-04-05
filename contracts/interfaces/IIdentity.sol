// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentity
 * @dev Interface for the Identity contract.
 */


interface IIdentity {
    function RECIPIENT_ROLE() external view returns (bytes32);
    function MERCHANT_ROLE() external view returns (bytes32);
    function ISSUER_ROLE() external view returns (bytes32);
        
    struct Preferences {
        address[] approvedMerchants;
        uint256 approvedAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 timeLimit;
        bool isBlocked;
    }
    function getRecipientPreferences(address recipient) external view returns (Preferences memory);
    
    function hasRole(bytes32 role, address account) external view returns (bool);
    function checkTriggers(address recipient, address merchant) external;
}
