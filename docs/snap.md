---
title: SNAP TRUST
name: SNAP Trust layer
status: raw
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This specification describes a proposal for the USDA SNAP program to integrate a trust layer into its current system to increase trust amongst recipients (card holders) and improve security.
Digital wallet identities and
smart contracts are the core components used to combat two types of popular attacks on the program: phishing scams and card skimming.

## Background/Motivation

There have been recent incidents reported by SNAP benefit participants about their available funds.
People have noticed their accounts do not have any funds before they are able to fund their accounts. 
These users have become victims of malicious attacks in the form of phishing attacks and card skimming methods.
 
The SNAP program needs to implement a trust layer with blockchain technology to help users regain security of their funds.
The

The second attack being addressed is card skimming scams.
This scam happens at payment terminals with approve SNAP merchants where the attacker steals the card information when a recipitant swipe card.

In this scam, it is difficult to know the attacker, as the terminal is compromised by the merchant
or an unknown party.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](http://tools.ietf.org/html/rfc2119).

The [Arc](na) blockchain MAY take advantage of USDC stablecoins as gas fees for transactions.
This is important as this proposal aims to support a government program which currently does not support the use of native cryptocurrencies like Ethereum.
For SNAP, the US dollar is required.
Stablecoins introduce an alternative to coins like Ethereum while still meeting the United States dollar requirement.
Also, as the program continues to integrate blockchain solutions,
a transition from the banking payment system to stablecoin payments will be easier, as they already would have started to support the blockchain infrastructure requirements of this proposal.

Since the system has not transitioned and the banking payment system will still be used for finality,
this proposal introduces a blockchain trust layer to be added to the current system.

### Registration

Before a person becomes a recipient of SNAP benefits,
that person is REQUIRED to fill out an application with the SNAP program.
Currently, the application collects certain important information to identify the applicant and
verify they are eligible for benefits.
The application SHOULD add the option to collect an Arc digital wallet address owned by the applicant.

#### Phishing Attacks

Scammers are incentivized to create phishing attacks aimed at the recipient through multiple forms like email, phone,
and website.
These phishing scams are designed to trick the applicant into believing they are interacting with a legitimate SNAP system.
If the applicant is tricked, their identity information is stolen and
used to apply for the benefits before the original applicant.
For example, a user may receive a malicious text message that states,
"Your SNAP benefits are suspended; verify your information".
An uninformed applicant or a recipient clicks a malicious link in the text and
enters the same information required by the SNAP program.
This could include information like an EBT card number, Social Security number, or
other information that could be used to drain the user's funds.

To combat this, each applicant MUST be required to manage an Arc digital wallet.
The public address of the recipient's wallet SHOULD be managed by the recipient and
registered during the application process.
This would allow the user to manage a private key that MUST NOT be shared during any process.
It is REQUIRED that the SNAP system store the current address for each recipient.
The smart contract SHOULD also store approved recipient addresses,
along with any previously approved addresses.
It is OPTIONAL for the issuer to store all previous addresses; this information could be retrieved on-chain.

If an attacker was able to steal relevant information of an applicant and
the applicant has not registered an address, the attacker's first point address.
When the applicant gets to the application,
they would be aware that an address has already been registered not belonging to them.
The applicant can then utilize the current system and
report fraud with the Health and Human Services system.

The proposed system in this document would reduce fraud reports,
as excluding the initial registration, the applicant would be able to stop fraud themselves.

When the applicant has successfully registered one address,
in most cases during renewal processes the same address would be used.
This would make it difficult for an attacker to register a new address with stolen information,
as the previous address verification would be required.

If the applicant loses access to a registered address,
they MAY restart the process as if there was no address registered.

### Flow

Registration Flow:

- Issuer deploys a tokenized reserve, a reserve token with minting controls, an identity policy, and a payment policy
- Applicants create a wallet
- Applicants complete applications in addition to the public address(signature),
could provide wallet management advice.
- The public address is registered with USDA system management and on the tokenized reserve contract
- Merchants complete application (identity MAY be original format or public address); the approved merchant's identifier SHOULD be registered on the registry contract. (policy)
- The issuer(USDA system) SHOULD have contract addresses for(reserve contract, identity, *merchant??)
- Issuer funds reserve contract with token and proof with all approved addresses
- When approved, the recipient MUST accept on-chain with proof and be able to set access controls(approved store, approved amount, approved time of day, approved merchant time limit). SHOULD be able to check activity on-chain.

Note: The wallet interactions during registration should be able to be verified by the user, as this may become a new phishing scam. The verification method MAY be the same method used to verify the application form.

Payment Flow:

- Recipient swipes card at approved merchant
- Issuer verifes cryptogram(**)
- Identifies the recipient and calls access controls on-chain
    1. If approved, issuer makes an on-chain record of the successful transaction
    2. If failed, send status to USDA system(system sends fail to POS)

Fraud Flow:

The attacker successfully steals recipient information:

1. Card skimming: the attacker has card information
    - Attacker attempt to swipe card with stole inforation at a new store.
    - USDA system calls contract and checks access controls.
    - % probability of failing if attacker does not use approved store, approved amount, approved time of day, etc.
2. Phishing scam: the attacker has the applicant's private information.
    - Attacker attempts to apply for assistance with a recipient that has a registered address.
    - Attempt fails as no signing access with current wallet
    - If attacker attempts to register a new address, fails because no signing with previous address
    - If the original recipient loses access to the wallet or the first registration,
 repeat the original process to register a new address(if the attacker does first registration first or forgot wallet, original fraud detection process to register new applicant should be used.)

### Tokenized Reserve

- the issuer is the owner
- define the register contract address
- user not able to vote
- restrict token transfers

During registration, the issuer MUST have deployed a tokenized reserve contract and
an identity contract.
The first proposal on the SHOULD be assigned to the identity contract address.
The contract address of the tokenized reserve SHOULD be publicly accessible.


``` solidity

struct proposalOpen {
    address owner;
 IERC20 token;
    address receiver;
    uint256 amount;
}


```
### Identity

``` solidity

function register(){
    // user identity
    //merchant identity
    // access controls(prefrences)
}

```
- approved applicant controls
- check during EMVco cycle
- approved store, approved amount, approved time of day, amount time per time period for an approved merchant(ex. one swipe per day)
-

#### Card Skimming

If an attacker is able to successfully steal a recipient's card information,
the attacker MUST NOT be able to use the card on failed access control calls.
The recipient MAY be notified if an access control attempt has failed.
The recipient SHOULD be able to block card().


### Usage

```solidity

function pay(address user, addreess merchant){
    // require merchant registered
    // check access control
    // check user registered
}

```

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)

## References

- [Tokenized Reserve - ERC7425](https://eips.ethereum.org/EIPS/eip-7425)