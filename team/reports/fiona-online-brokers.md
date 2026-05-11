# Report: Online Forex Brokers with API Access & Custom Demo Accounts

**Prepared by:** Fiona - Product Manager
**Date:** May 11, 2026
**Project:** Lunaris Forex MVP

## 📋 Executive Summary
To support our algorithmic trading MVP, we require a broker that provides a robust, easy-to-use API and the ability to simulate realistic account sizes (e.g., 1,000 or 5,000 EUR). Based on technical accessibility and account flexibility, **OANDA** and **Pepperstone (cTrader)** are the top recommendations.

---

## 🏛️ Recommended Brokers

### 1. OANDA (Primary Recommendation)
OANDA is the industry standard for retail API trading, particularly for web developers.
*   **API Accessibility:** High. Uses a modern **REST v20 API** and **Streaming API** (WebSocket/Chunked HTTP). Documentation is excellent.
*   **Trade Management:** Full support for initiating, monitoring, modifying (TP/SL), and closing trades.
*   **Custom Demo Accounts:** 
    *   Allows creating multiple "Practice" sub-accounts.
    *   Starting balance can be set to any custom amount (e.g., **1,000 EUR** or **5,000 EUR**).
    *   Balances can be reset or topped up at any time via the OANDA Hub.
*   **Base Currency:** Supports **EUR** accounts.

### 2. Pepperstone (via cTrader Open API)
Ideal for those who prefer a modern, Protobuf-based API and a very clean platform.
*   **API Accessibility:** High. The **cTrader Open API** is free and developer-friendly with official SDKs.
*   **Trade Management:** Comprehensive capabilities for all order types and position management.
*   **Custom Demo Accounts:** 
    *   When creating a demo account through the cTID portal, you can select specific amounts like **2,000**, **5,000**, or enter a custom amount depending on the platform version.
*   **Base Currency:** Supports **EUR** accounts.

### 3. IG Markets
A heavyweight broker with deep liquidity but slightly more administrative friction.
*   **API Accessibility:** Medium. Provides a robust REST API. Usually requires a live account profile to be created first (though not necessarily funded) to access the API companion (demo) environment.
*   **Trade Management:** Full execution and monitoring capabilities.
*   **Custom Demo Accounts:** Default balances are usually higher (€10k+), but if using the MT4-integrated demo, you can specify custom amounts during the terminal setup.

### 4. Capital.com
A modern, fast-growing broker in Europe.
*   **API Accessibility:** High. Modern REST and WebSocket API.
*   **Trade Management:** Supports all standard trade operations.
*   **Custom Demo Accounts:** Flexible demo funds that can be reset or topped up to desired levels (e.g., **5,000 EUR**).

---

## 👥 How the Team Can Help

The following agents in `@team/agents/**` are uniquely qualified to assist with this integration:

### 📐 Alice (Forex Software Architect)
*   **Role:** Can author **Architectural Decision Records (ADRs)** to justify the choice of OANDA over other brokers based on latency vs. developer velocity.
*   **Action:** Design the "Broker Interface" that allows us to swap OANDA for Pepperstone later if needed.

### 🚰 Bob (Forex Data Engineer)
*   **Role:** Expert in **OANDA v20 Pricing Streams**.
*   **Action:** Implement the resilient WebSocket connection manager to ingest live EUR/USD ticks from the broker into our Redis bus.

### 🏗️ Diana (Forex Backend Architect)
*   **Role:** Specialized in **OANDA v20 REST API integration**.
*   **Action:** Build the execution service that handles order payloads (Market/Limit), attaches Stop Losses, and manages transaction idempotency.

### 🔒 Hannah (Security & Reliability Engineer)
*   **Role:** Guardian of the **API Keys**.
*   **Action:** Implement secure secrets management (e.g., encrypted `.env` or Vault) so our OANDA Bearer tokens never leak.

### ⏱️ Ian (Performance Benchmarker)
*   **Role:** Latency and **Slippage Analysis**.
*   **Action:** Measure the "Tick-to-Trade" latency to ensure our OANDA API calls are fast enough to catch signals during volatility.

---

## 🚀 Next Steps
1.  **Selection:** Confirm OANDA as the primary MVP broker (aligned with Diana and Bob's existing profiles).
2.  **Setup:** Create a practice account with exactly **1,000 EUR** to begin signal validation.
3.  **Authentication:** Pass credentials securely to Diana and Bob for initial pipeline tests.
