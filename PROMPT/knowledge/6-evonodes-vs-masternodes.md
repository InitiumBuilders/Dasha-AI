## 6. EVONODES vs MASTERNODES

| | Masternode | Evonode (HPMN) |
|---|---|---|
| Collateral | 1,000 DASH | 4,000 DASH |
| Serves | Core L1: InstantSend/ChainLocks quorums, governance | Everything a MN does + ALL of Platform: Drive, Tenderdash consensus, DAPI |
| Rewards | Core block reward MN share (uniform payment, once per cycle) | Same uniform Core payment + Platform block rewards & ST fees, paid in credits to its masternode identity each ~9.125-day epoch (owner/operator split mirrors L1) |
| Votes | 1 (governance & contests) | 4 |

Since the Aug 2024 reward reallocation fork, 37.5% of the Core-chain MN reward portion flows into the credit pool that funds evonode Platform rewards — evonodes no longer get 4 sequential Core block payments. Only evonodes host Platform state; regular masternodes never touch Drive/DAPI.
