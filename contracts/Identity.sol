// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "./interfaces/IIdentity.sol";

/**
 * @title Identity
 * @dev Manages identities for recipients and merchants,
 * including historical addresses and user-defined access controls.
 */
contract Identity is AccessControl, IIdentity {
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
    event AccessControlTriggered(uint256 time, uint256 whichPref);

    bytes32 private _root;

    struct RecipientRecord {
        address currentAddress;
        uint256 currentValue; //current approved value
        IIdentity.Preferences preferences;
    }

    struct MerchantRecord {
        address wallet;
        uint256 externalId; // Optional external identifier (e.g., POS ID)
    }

    // Mapping from a unique recipient ID (could be social security or internal ID)
    // to their historical and current wallet information.
    // For simplicity, we use current wallet to look up history/preferences.
    mapping(address => RecipientRecord) private _recipients;
    mapping(address => MerchantRecord) private _merchants;

    // Tracking merchant addresses by their external ID
    mapping(uint256 => address) private _idToMerchant;

    // Track the last timestamp of interaction for cooldown checks
    mapping(address => uint256) private _lastTransactionTime;

    constructor(address issuer) {
        _grantRole(DEFAULT_ADMIN_ROLE, issuer);
        _grantRole(ISSUER_ROLE, issuer);
    }

    // --- View Functions ---
   
    function getRecipientPreferences(
        address wallet
    ) external view override returns (IIdentity.Preferences memory) {
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
    // Add new merkle root for approved addresses
    function addMerkleRoot(bytes32 root) external onlyRole(ISSUER_ROLE) {
        _root = root;
    }

    function hasRole(bytes32 role, address account) public view override(AccessControl, IIdentity) returns (bool) {
        return super.hasRole(role, account);
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
        _recipients[msg.sender].currentValue = value;
        emit RecipientRegistered(true, value);
    }

    /**  sign with old wallet to grant new wallet 
    function signOld(address newWallet) external returns(bytes) {
        bytes signature = keccak256(abi.encodePacked(msg.sender, newWallet, address(this)));
        return (signature);
    }
    // add off-chain script for recipient to use
    */
    /**
     * @dev Allow recipient to update a recipient's address.
     * Requires the recipient to sign with their previous address OR approved by ADMIN.
     */
    function updateRecipientAddress(
        address recipient, // oldWallet
        address newWallet,
        bytes calldata signature,
        bool admin
    ) external {
        address signer;
        if (admin) {
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Not admin");
            signer = recipient;
        } else {
            bytes32 messageHash = keccak256(
                abi.encodePacked(recipient, newWallet, address(this))
            );

            bytes32 ethSignedMessageHash = MessageHashUtils
                .toEthSignedMessageHash(messageHash);
            signer = ECDSA.recover(ethSignedMessageHash, signature);
            require(signer == recipient, "Invalid signature");
            require(
                hasRole(RECIPIENT_ROLE, signer),
                "Not a registered recipient"
            );
        }

        require(
            !hasRole(RECIPIENT_ROLE, newWallet),
            "New address already in use"
        );

        // Migrate data
        _recipients[newWallet] = _recipients[signer];
        _grantRole(RECIPIENT_ROLE, newWallet);
        _revokeRole(RECIPIENT_ROLE, signer);
        delete _recipients[signer];

        emit RecipientAddressUpdated(signer, newWallet);
    }

    /**
     * @dev Register a new merchant with optional admin.
     */
    function registerMerchant(
        bytes32[] calldata proof,
        bool admin,
        uint256 externalId,
        address wallet
    ) external onlyRole(ISSUER_ROLE) {
        require(!hasRole(MERCHANT_ROLE, wallet), "Merchant already registered");
        if (admin) {
            require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender));
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
     * Which = UpdatemMerchant=0; UpdateTime=1; UpdateSwipe=2
     */
    function setPreferences(
        bool[] calldata which,
        address[] calldata approvedMerchant,
        uint256 approvedAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 timeLimit
    ) external {
        require(hasRole(RECIPIENT_ROLE, msg.sender), "Not a recipient");

        Preferences storage pref = _recipients[msg.sender].preferences;
        // update which approved merchant, max amount here(approvedAmount)
        if (which[0]) {
            for (uint256 i = 0; i < approvedMerchant.length; i++) {
                pref.approvedMerchants.push(approvedMerchant[i]);
            }
            pref.approvedAmount = approvedAmount;
        }
        // update the startTime and endTime for card use
        if (which[1]) {
            pref.startTime = startTime;
            pref.endTime = endTime;
        }
        // update the swipe count limit( access control check limit)
        if (which[2]) {
            pref.timeLimit = timeLimit;
        }

        emit PreferencesUpdated(msg.sender, pref);
    }

    /**
     * @dev Check and return the status of access control triggers for a recipient.
     * trigers: BLOCKED: 4, OUTSIDE_TIME: 3, UNAPPROVED: 2, SWIPE_LIMIT: 1
     */
    function checkTriggers(
        address recipient,
        address merchant
    ) external onlyRole(ISSUER_ROLE) {
        Preferences storage pref = _recipients[recipient].preferences;

        // 1. BLOCKED check
        if (pref.isBlocked) {
            emit AccessControlTriggered(block.timestamp, 4);
        }

        // 2. OUTSIDE_TIME check (assuming startTime/endTime as hours 0-23)
        uint256 currentHour = (block.timestamp / 3600) % 24;
        bool outsideTime = false;
        if (pref.startTime != 0 || pref.endTime != 0) {
            if (pref.startTime < pref.endTime) {
                if (
                    currentHour < pref.startTime || currentHour >= pref.endTime
                ) {
                    outsideTime = true;
                }
            } else {
                // Crosses midnight (e.g., 22 to 02)
                if (
                    currentHour < pref.startTime && currentHour >= pref.endTime
                ) {
                    outsideTime = true;
                }
            }
        }
        if (outsideTime) {
            emit AccessControlTriggered(block.timestamp, 3);
        }

        // 3. UNAPPROVED merchant check
        if (pref.approvedMerchants.length > 0) {
            bool found = false;
            for (uint256 i = 0; i < pref.approvedMerchants.length; i++) {
                if (pref.approvedMerchants[i] == merchant) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                emit AccessControlTriggered(block.timestamp, 2);
            }
        }

        // 4. SWIPE_LIMIT (cooldown) check
        if (pref.timeLimit > 0) {
            if (
                block.timestamp <
                _lastTransactionTime[recipient] + pref.timeLimit
            ) {
                emit AccessControlTriggered(block.timestamp, 1);
            }
        }
    }
    /**
     * @dev Block/Unblock the account. Useful for card skimming defense.
     */
    function setBlocked(bool status) external onlyRole(RECIPIENT_ROLE) {
        _recipients[msg.sender].preferences.isBlocked = status;
        emit AccountBlocked(msg.sender, status);
    }
}
