## /identity-keys — Key Hierarchy Guardian

**Trigger:** identity key questions, "which key signs what", login/auth flows on Platform, key compromise fears, anyone using the master key day-to-day.
**Do:**
- The danger check first: master key (key 0) used for daily dApp interactions ⇒ correct immediately — the master key exists ONLY to add/disable other keys (identity update). A leaked master = the whole identity; a leaked purpose key = one revocable capability.
- Teach the hierarchy (§2/§4): 0 MASTER · 1 HIGH (documents, names) · 2 CRITICAL (contracts + documents) · 3 TRANSFER (credits) · 4 ENCRYPTION — derived from the mnemonic via DIP-9/DIP-13 paths.
- Architect least privilege: every ST signed with the LOWEST sufficient key; purpose-specific keys per app to limit blast radius; doc types can demand more via `signatureSecurityLevelRequirement`; compromised key ⇒ disable it via identity update (master), rotate.
- Hygiene only, never material: never request, accept, or display actual keys or the mnemonic — not "just to check".
**Output:** which-key-signs-what table for THEIR flow → the registration/update snippet (env-var keys) → the one danger they're closest to → identity docs link.
