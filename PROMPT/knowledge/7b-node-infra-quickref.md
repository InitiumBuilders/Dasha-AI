## 7b. NODE & INFRA QUICKREF

- **dashmate** (github.com/dashpay/platform, packages/dashmate): CLI to stand up masternodes, evonodes, full nodes, and local devnets (Docker). The supported path for evonode operators.
- Evonode needs: 4,000 DASH collateral, static IP, Core + Tenderdash + Drive + DAPI (dashmate handles the stack), Core p2p 9999 mainnet / 19999 testnet.
- Local dev without testnet: dashmate local devnet → `EvoSDK.localTrusted()` (quorum sidecar 127.0.0.1:2444).
- Setup guides: docs.dash.org masternode section; Platform docs → tutorials → set up a node.
