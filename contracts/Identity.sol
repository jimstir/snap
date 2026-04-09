// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/ISnapReserve.sol";

/**
 * @title Identity
 * @dev Manages identities for recipients and merchants,
 * including historical addresses and user-defined access controls.
 */
contract Identity is AccessControl {
    bytes32 public constant RECIPIENT_ROLE = keccak256("RECIPIENT_ROLE");
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    event RecipientRegistered(bool registered, uint256 value);
    event RecipientAddressUpdated(
        address indexed oldWallet,
        address indexed newWallet
    );
    event MerchantRegistered(address indexed wallet, uint256 externalId);
    event PreferencesUpdated(
        address indexed recipient,
        Preferences preferences
    );
    event AccountBlocked(address indexed recipient, bool status);
    
    struct Preferences {
        address[] approvedMerchants;
        uint256 approvedAmount; // Maximum amount per transaction
        uint256 startTime; // Hour of day (0-23)
        uint256 endTime; // Hour of day (0-23)
        uint256 timeLimit; // Cooldown between transactions in seconds
        bool isBlocked; // Recipient can block their own account
    }

    struct RecipientRecord {
        address currentAddress;
        //address[] history; // remove?
        uint256 value; //current approved value
        Preferences preferences;
    }

    struct MerchantRecord {
        address wallet;
        uint256 externalId; // Optional external identifier (e.g., POS ID)
    }
    bytes32 private _root;
    ISnapReserve public reserve;

    // Mapping from a unique recipient ID (could be social security or internal ID)
    // to their historical and current wallet information.
    // For simplicity, we use current wallet to look up history/preferences.
    mapping(address => RecipientRecord) private _recipients;
    mapping(address => MerchantRecord) private _merchants;

    // Tracking merchant addresses by their external ID
    mapping(uint256 => address) private _idToMerchant;

    constructor(address issuer, address _reserve) {
        _grantRole(DEFAULT_ADMIN_ROLE, issuer);
        _grantRole(ISSUER_ROLE, issuer);
        reserve = ISnapReserve(_reserve);
    }

    // --- View Functions ---
    
    // check the reserve address
    function checkReserve() external view returns(ISnapReserve){
        return(reserve);
    }

    function getRecipientPreferences(
        address wallet
    ) external view returns (Preferences memory) {
        return _recipients[wallet].preferences;
    }

    function getMerchantByExternalId(
        uint256 externalId
    ) external view returns (address) {
        return _idToMerchant[externalId];
    }

    function getMerchantRecord(
        address wallet
    ) external view returns (MerchantRecord memory) {
        return _merchants[wallet];
    }

    //check if recipient set to BLOCK
    function checkBlock(address recipient) public view returns(bool){
        return(_recipients[recipient].preferences.isBlocked);
    }
    // add merkle root
    function addRoot(bytes32 root) external onlyRole(ISSUER_ROLE) returns(bool){
        _root = root;
        return (true);
    }

    /**
     * @dev Register a new approved recipient.
     */
    function registerRecipient(
        bytes32[] calldata proof,
        uint256 value
    ) external {
        require(!hasRole(RECIPIENT_ROLE, msg.sender), "Already registered");
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, value));

        bool isValid = MerkleProof.verify(proof, _root, leaf);
        require(isValid, "Not approved");

        _grantRole(RECIPIENT_ROLE, msg.sender);
        _recipients[msg.sender].currentAddress = msg.sender;
        _recipients[msg.sender].value = value;
        emit RecipientRegistered(true, value);
    }

    /**
     * @dev Allow recipient to update a recipient's address.
     * Requires the recipient to sign with their previous address OR approved by ADMIN.
     */
    function updateRecipientAddress(
        bytes calldata oldWallet,
        bool admin,
        bytes calldata signature
    ) external {
        address signer;

        if (admin) {
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
        } else {
            bytes32 messageHash = keccak256(
                abi.encodePacked(oldWallet, msg.sender, address(this))
            );

            signer = ECDSA.recover(
                MessageHashUtils.toEthSignedMessageHash(messageHash),
                signature
            );
            require(hasRole(RECIPIENT_ROLE, signer));
            require(
                !hasRole(RECIPIENT_ROLE, msg.sender),
                "New address already in use"
            );
        }

        _grantRole(RECIPIENT_ROLE, msg.sender);
        _revokeRole(RECIPIENT_ROLE, signer);

        emit RecipientAddressUpdated(signer, msg.sender);
    }

    /**
     * @dev Register a new merchant with optional admin.
     */
    function registerMerchant(
        bool admin,
        uint256 externalId,
        address wallet,
        bytes calldata signature
    ) external {
        address signer;

        if (!admin) {
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
        }else {
            require(!hasRole(MERCHANT_ROLE, msg.sender), "Merchant already registered");
            // check signature from issuer
            bytes32 messageHash = keccak256(
                abi.encodePacked(msg.sender, address(this))
            );
            signer = ECDSA.recover(
                MessageHashUtils.toEthSignedMessageHash(messageHash),
                signature
            );
            require(hasRole(ISSUER_ROLE, signer));

        }
        _grantRole(MERCHANT_ROLE, wallet);
        _merchants[wallet] = MerchantRecord(wallet, externalId);

        if (externalId != 0) {
            _idToMerchant[externalId] = wallet;
        }

        emit MerchantRegistered(wallet, externalId);
    }

    /**
     * @dev Recipients set all preferences at once their own preferences for access control.
     */
    function setPreferences(
        bool[] calldata which,
        address[] calldata approvedMer,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        uint256 timeLimit
    ) external onlyRole(RECIPIENT_ROLE) {
        // require is recipient role
        Preferences storage user = _recipients[msg.sender].preferences;
        // update which approved merchant, max amount here(approvedAmount)
        if (which[0]) {
            // Append new approvedMerchants to the end of the list (do not clear existing)
            for (uint i = 0; i < approvedMer.length; i++) {
                user.approvedMerchants.push(approvedMer[i]);
            }
            user.approvedAmount = amount;
        }
        // update the startTime and endTime for card use
        if (which[1]) {
            user.startTime = startTime;
            user.endTime = endTime;
        }
        // update the swipe count limit( access control check limit)
        if (which[2]) {
            user.timeLimit = timeLimit;
        }

        emit PreferencesUpdated(msg.sender, user);

    }

    /**
    // Record if a prefrences check failed
    // BLOCKED= 1, APPROVED = 2, TIMESLOT = 3, SWIPES = 4
    function checkTriggers() external {

    }
    */

    /**
     * @dev Block/Unblock the account. Useful for card skimming defense.
     */
    function setBlocked(bool status) external onlyRole(RECIPIENT_ROLE) {
        _recipients[msg.sender].preferences.isBlocked = status;
        emit AccountBlocked(msg.sender, status);
    }
}
