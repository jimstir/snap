# SNAP Trust Layer Simulation

This repository contains a proof-of-concept implementation of a **Smart Trust Layer** for the Supplemental Nutrition Assistance Program (SNAP). By leveraging the **Arc Testnet** and smart contracts, we introduce granular, user-controlled security to government benefit distribution.

---

## 🏗 System Architecture

The simulation consists of four core smart contracts:
- **`Identity.sol`**: The registry for Recipients and Merchants. It handles role-based access control and stores personal security preferences.
- **`SnapReserve.sol`**: An escrow system that holds SNAP funds and only releases them when transaction policies are met.
- **`Usage.sol`**: The transaction gateway. It validates every "swipe" against the Identity contract's preferences and the Reserve's balance.
- **`SnapToken.sol`**: A custom ERC-20 stablecoin used to simulate SNAP value on-chain.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **MetaMask** browser extension.
- **Arc Testnet Config**: Add the Arc Testnet to your MetaMask.
  - **RPC URL**: `https://rpc.arc.testnet.com` (Example)
  - **Chain ID**: `5042002`

### 2. Smart Contracts
The contracts are located in the `/contracts` directory. You can compile and test them using Hardhat:
```bash
cd Snap
npx hardhat compile
npx hardhat test
```

### 3. Frontend Simulation
To run the interactive dashboard:
```bash
cd Snap/simulation
npm install
npm run dev
```
Visit `http://localhost:5173` to interact with the Trust Layer.

---

## 🛡 Testing Attack Scenarios (Security Walkthrough)

The simulation is designed to demonstrate how the Trust Layer prevents common fraud scenarios described in [snap.md](docs/snap.md). Follow these steps to test the defenses:

### Scenario 1: Preventing "Card Skimming" (Temporal Defense)
1. **Setup**: Go to the **Access Control** page.
2. **Action**: Enable "Category 2: Usage Windows" and set a time range (e.g., 08:00 to 17:00).
3. **Attack**: Go to the **Transaction** page. Attempt to "Swipe" a payment while the current time is outside your window.
4. **Result**: The transaction will revert with a `TIMESLOT` trigger failure, demonstrating that a stolen card cannot be used at night.

### Scenario 2: Phishing & Fraudulent Merchants (Whitelisting)
1. **Setup**: On the **Access Control** page, enable "Category 1" and add only one specific merchant address you trust.
2. **Attack**: On the **Transaction** page, attempt to pay an **arbitrary wallet address** not in your whitelist.
3. **Result**: The Trust Layer will block the payment, preventing "phishing" merchants from draining benefits.

### Scenario 3: Excessive Spending (Amount Limits)
1. **Setup**: Set your "Max Amount per Swipe" to **$20**.
2. **Attack**: Attempt to swipe for **$100**.
3. **Result**: The transaction will be rejected by the `Usage` contract's policy check, preventing large-scale fraudulent withdrawals.

### Scenario 4: The "Panic Block"
1. **Action**: If you suspect your card is compromised, click the **"Panic Block"** button on the Access Control page.
2. **Result**: All future transactions—even those from whitelisted merchants—will be instantly disabled on-chain until you manually unblock the account.

---

## 📝 Important Information
- **Issuer Identity**: Most administrative functions (like `registerMerchant` and `pay`) require the **Issuer Role**. In this simulation, the account that deploys the system is assigned the Issuer role.
- **Gas Fees**: While the Trust Layer aims to use USDC for fees, the current testnet simulation requires a small amount of native gas for transaction execution.
- **Persistent State**: Contract addresses are saved to your browser's `localStorage` so you can continue your session across page refreshes.

---

## License
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)