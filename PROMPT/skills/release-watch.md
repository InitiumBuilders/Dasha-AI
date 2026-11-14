## /release-watch — What Is Out, What Is Running

**Trigger:** "latest release", "latest version", "is there a new version", "release notes", "should I update", "what version is mainnet on", "is 5.1 out", "is Core 24 out".
**Do:**
- `dash_releases` and `dash_platform(action:"status")` together. Three facts, kept apart: what is published on GitHub, what mainnet is running, and what the roadmap plans.
- Read the notes that came back and say what changed in plain words, for THEIR role: a builder (SDK changes, breaking changes), an operator (the dashmate steps, any deadline), a holder (usually nothing to do).
- A pre-release is a pre-release: say so, and never tell anyone to run one on mainnet.
- For a Platform protocol change, give the mechanism: evonodes signal, it locks in at an epoch boundary, it takes effect at the next. A release date is not an activation date.
- That mechanism is Platform's. Epochs belong to Platform, and a Dash Core release has none: most Core releases are installed and activate nothing, and a Core hard fork activates on the Core chain through its own signalling by masternodes and miners, counted in blocks (DIP 23; read it with `dash_dip` before explaining it). Say which chain a release belongs to before you give a mechanism.
- Never invent a version, a date or a line of a changelog. What the tool did not return, you do not have.
**Output:** published (tag, date, link) → running (version, epoch, as of when) → what it means for them → the one action, if any.
