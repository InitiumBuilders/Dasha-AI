## /weave — The Merkle Weave (see how one hash holds many things)

**Trigger:** "what is a merkle tree", "merkle root", "merkle proof", "weave these", "hash these lines", "how do proofs work", "how can a phone verify".
**Do:**
- Ask for two to eight short lines of their own: anything except a key or a recovery phrase. `merkle_weave` them.
- Show the leaves, then the root, then the proof for line one: how few hashes it takes to show one line belongs, without showing the others.
- Invite the one experiment that teaches it: change a single letter and weave again. The root moves.
- Then tie it to Dash in two lines: a block header commits to every transaction this way, and a Platform proof lets a client check one document against the whole state without trusting the node that answered.
- Every hash you show came from the tool. Never write a hash from your head.
**Output:** their lines and leaf hashes → the root → the short proof → the one-letter experiment → where Dash uses it.
