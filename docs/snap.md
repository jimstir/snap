---
title: SNAP TRUST
name: SNAP Trust layer
status: raw
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This specification describes a proposal for the USDA SNAP program to integrate a trust layer to their current system to increase trust amongst recipiants(card holders) and improve security.
Digital wallet identities and
smart contracts are the core components used to combat two type of popular attacks to the program, phishing scams and card skimming.

## Background/Motivation

There have been recent incidents reported by SNAP benefit participants about their avaible funds.
People have noticed their account do not have any funds before they are able to fund there account. 
These user's have become victim to malicious attacks in the forom of phishing attacks and card skimming methods.
 
The snap program needs to implement a trust layer with blockchain technology to help user regain security of their funds.
The

The second attcked being address is card skimming scams.
This scam happens at payment terminals with approve SNAP merchants where the attacker steals the card information when a recipitant swipe card.

In this scam it is difficult to know the attacker as terminal is comprised by the merchant
or an unknown party.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](http://tools.ietf.org/html/rfc2119).

The [Arc](na) blockchain MAY to take advantage of USDC stablecoins as gass fees for trasactions.
This is important as this proposal aims to support a government program which currently does not support the use of native cryptocurrenies like Ethereum.(Genius Act??*)
For SNAP, the US dollar is required.
Stablecoins intorduce an alternative to coins like Ethereum while still meeting the United States dollar requirement.
Also, as the program continues to intergrate blockchain solutions,
a transition from the banking payment system to stablecoin payments will be easier as they already would have started to support the blockchain infrusture requirements of this proposal.

Since the system has not transitioned and the banking payment system will still be used for finalaity,
this proposal introduces a blockchain trust layer to be added to the current system.

### Registersation

Before a person becomes a recipiant of SNAP benifits,
that person is REQUIRED to fill an application with the SNAP program.
Currently, the application collects cerain important information to identity the applicant and
verify they are eligable for benifits.
The application SHOULD add the option to collect an Arc digital wallet address owned by the appliciant.

#### Phishing Attacks

Scamers are incentivized to create phishing attacks aimed at the recipiant through multiple forms like email, phone,
and website.
These phishing scams are designed to trick the applicant to believe they are interacting with a legimate SNAP system.
If the applicant if tricked, their identity information is stolen and
used to apply for the benifets before the orginal applicant.
For example, a user may receive a malicious text message that states,
"Your SNAP benefits are suspended, verify you information".
An uninformed applicant or a receipant clicks a malicious link on the text and
enters the same information required by the SNAP program.
This could include  information, like EBT card number, social security number, or
other information that could be used to drain the user's funds.

To combat this, each applicant MUST be required to manage a Arc digital wallet.
The public address of the recipiant's wallet SHOULD be managed by the recipiant and
register the address during the applicaiton process.
This would allow the user to mange a private key that MUST NOT be sharedduring any process.
It is REQUIRED that the SNAP system store the current address for each recipiant.
The smart contract SHOULD also store approve recipiant addresses,
along with any previously approved addresses.
It is OPTIONAL for the issuer to store all previous addresses, this information could be retrived on-chain.

If an attacker was able to steal releavant information of a applicant and
the applicant has not registered an address already making the attackers the first point address.
When the applicant gets to the application,
they would be aware that an address has already been registered not belonging to them.
The applicant can then utilize the current system and
report fraud with the Health and Human Service system.

The proposed system in this specifcation would reduce fraud reports,
as excluding the initial registration the appplicant would be able to stop fraud themselves.

When the applicant has successfully registerd one address,
in most cases during renewal processes the same address would be used.
This would make it difficult for an attacker to register a new address with stolen information,
as the previous address verification would be required.

If the applicant loses access to a registered address,
they MAY restart the process as if there was no address registered.

### Flow

Registration Flow:

- Issuer deploy a tokenized reserve, a reserve token with mintng controls, an identity policy, a payment policy
- Appliciants create a wallet
- Applicants complete applications in addition to the public address(signature),
could provide wallet management advice.
- The public address is registered with USDA system management and the on tokenized reserve contract
- Merchants complete application, (identity MAY be orginial format or public address), the approved merchant's identifier SHOULD be registered on the registry contract.(policy)
- The issuer(USDA system) SHOULD have contract addresses for(reserve contract, identity, *merchant??)
- Issuer funds reserve contract with token and proof with all approved addresses
- When approved the recipiant MUST accept on-chain with proof be able to set access controls(approved store, approved amount, approved time of day, approved merchant time limit). SHOULD be able to check activity on-chain.

Note: The wallet interactions during registration should be able to be verified by user, as this may become a new phishing scam. The verification method MAY be the same method used to verfiy the application form.

Payment Flow:

- Recipiants swipes card at approve merchant
- Issuer verifes cryptogram(**)
- Identifies the recipiant and calls access controls on-chain
    1. If approved, issuer makes on-chain record of successful transaction
    2. If failed, send status to USDA system(system sends fail to POS)
- V
-

Fraud Flow:

The attacker successfully steals reciptant information:

1. Card skimming the attacker has card information
    - Attacker attempt to swipe card with stole inforation at a new store.
    - USDA system calls contract and check access controls.
    - % probablitiy of failing if attacker does not use approved store, approved amount, approved time of day, etc..
2. Phishing scam the attacker has the applicant's private information.
    - Attacker attempts to apply for assitance with a recipiant that has a registered address.
    - Attempt fails as no signing access with current wallet
    - If attacker attempts to register a new address, fails because no signing with previous address
    - If orginial recipiant loses access to wallet or first registration,
    repeat orginial process to register new address(if attacker does first registration first or forgot wallet, orginial fraud detection process to register new applicant should be used.)

### Tokenized Reserve

- the issuer is the owner
- define the register contract address
- user not able to vote
- retrict token transfers

``` solidity

function register(){
    // user identity
    //merchant identity
    // access controls(prefrences)


}


```

### Access Controls

- approved applicant controls
- check during EMVco cycle
- approved store, approved amount, approved time of day, amount time per time period for a approved merchant(one swipe per day)
-

#### Card Skimming

If an attacker is able to successfully steal a recipitant card information,
the attacker MUST NOT be able to use the card on failing access controls calls.
The recipitant MAY be notified if when access controls attempt has failed.
The recipitant SHOULD be able to block card().


### M

During registration, the issuer MUST have deployed a tokenized reserve contract and
a identity contract.
The first proposal on the SHOULD be assigned to the identity contract address.
The contract address of the tokenized reserve SHOULD be publicly accessible.


``` solidity

struct proposalOpen {
    address owner;
    IERC20 token;
    address receiver;
    uint256 amount;
}


function pay(address user, addreess merchant){
    // require merchant registered
    // check access control
    // check user registered
}

```


## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)

## References