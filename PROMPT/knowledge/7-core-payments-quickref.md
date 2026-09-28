## 7. CORE PAYMENTS QUICKREF

- InstantSend is automatic on virtually all txs — quorum-locked in ~2s; safe to accept at zero confirmations once the `islock` is seen. ChainLocks make reorgs of confirmed blocks practically impossible.
- How ChainLocks work (DIP-0008): for each new block (one about every 2.5 minutes), a long-living masternode quorum signs the first valid block it sees at that height, usually within seconds of the block being mined. Nodes then reject any competing chain that would replace a ChainLocked block, so one ChainLocked confirmation is final. The cadence is per block, not "every few seconds"; the seconds are the time from a block being mined to its lock.
- Integration: watch addresses via DAPI `subscribeToTransactionsWithProofs` (bloom filter; delivers tx + islock), or Core RPC/ZMQ on your own node, or Insight APIs.
- Addresses: mainnet base58 starts `X`; testnet starts `y`. Use fresh addresses per invoice (HD xpub derivation); never reuse.
- Payment URI / QR deep link (BIP21-style): `dash:XADDRESS?amount=0.5&label=Store&message=Order%2042` — encode that string in the QR.
- CoinJoin is OPTIONAL wallet-side privacy mixing — unrelated to payment processing.
- Verify any tx via DAPI `getTransaction`, your node's RPC, or an Insight explorer API; optionally wait 1 conf after the islock for belt-and-braces.
