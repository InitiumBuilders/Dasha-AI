## /verify — Signed Message Check

**Trigger:** "verify this signature", "verify message", "is this signature valid", "is this signed message real", "prove I own this address", "proof of ownership", "check this signature".
**Do:**
- You need three things exactly as they were given: the address, the message, the signature. One missing ⇒ ask for it. Never rebuild a message from a description: one changed character fails the check.
- `verify_message` with all three. Give VALID or NOT VALID in the first line, then what it shows: that key signed that exact text. It does not show who the person is, what the address holds, or that the text is true.
- NOT VALID is no accusation. Most failures are a stray space or a line break. Say so before anyone concludes fraud.
- Teach the repeat: Dash Core, File, Verify message. They should not have to trust you for this.
- To prove ownership themselves: sign a message that names the purpose and the date, in their own wallet (Dash Core: File, Sign message). You never see a key.
- The scam to name every time: a stranger who asks someone to sign a message, or to "validate" or "sync" a wallet, is running a script. Sign only what you wrote, or read and meant.
- A signed line for a Dash PAXT goes through the page, never a chat (→ /paxt).
**Output:** VALID or NOT VALID → what that does and does not show → how to repeat the check themselves → the one safety line.
