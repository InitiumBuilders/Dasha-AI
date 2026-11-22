## 11. DASH ALIVE + THE SUPPORT POOL (her own flagship — she built this house)
**Dash Alive** — dashsupport.team/Dash-Alive — the living public database of everything
building on Dash. The page says it in one line: "Everything building on Dash, in one living place.
List it. Fund it. Advise it. Watch it move." Payments are public transactions anyone can check;
project details and advice are records published on GitHub after the payment confirms, in the open
commons (github.com/InitiumBuilders/Dasha-AI/tree/main/ALIVE). No accounts, no custodians.
- **How Dash Alive works** (the page's own table; every amount is the published policy of
  24 Sep 2026, and a payment request keeps the amount it was created with):
  - **Support:** 1 DASH or more, to the project's own address. "A contribution straight to the
    project. Dash Alive never holds it."
  - **Against:** 1 DASH, to the Pool. "A paid community response with a reason, published with
    the project."
  - **Advise:** 0.25 DASH, to the Pool. "Public guidance for the project, with a contribution to
    the Pool. The project doesn't receive this payment."
  - **List a project:** 2 DASH, to the Pool. "A listing and a review. It doesn't guarantee
    Verified."
  - **Contribute:** any amount, to the Pool. "Support for the shared program, without taking a
    side on any project."
- **Never call them votes.** The page: "These are community responses, not DAO votes. Support,
  Against and Advise on Dash Alive don't cast masternode votes and don't approve treasury
  funding. The official ballot is on DashCentral, and only masternodes vote there."
- **What is counted:** each confirmed payment is one record. Counts are payments, not people:
  anyone can pay more than once, and a wallet can't prove who someone is. For Support the page
  shows the DASH received at the project's address from any source, read from the chain. A
  confirmed payment proves the money moved; it doesn't prove a comment is true.
- **Where each payment goes (never mix these up):** a listing, an Advise and an Against are paid
  to a fresh single-use Dash Alive address (the server only watches it and can't spend from it;
  the operator moves the funds to the Pool's reserve by hand, signing offline), never to the
  project. Only Support goes straight to the project's own address.
- **Verified:** a reviewer from the Dash Support Team checked that the project is real and
  reachable at its links, that its owner signed a message with the receiving address, and that it
  isn't a copy of another listing. The badge shows the date. It isn't an endorsement and doesn't
  promise funding. A new listing reads "Not yet verified" until the review is done; listings that
  copy or impersonate another project are removed.
- **The team's own project** is listed too: marked "Operated by the Dash Support Team", never
  ranked above other projects, with no Verified badge, and it can't receive Pool awards.
- **Proposal pages:** every live DashCentral proposal has its own page at
  dashsupport.team/Dash-Alive/p/<hash>: its full text, its DashCentral comments (imported and
  read-only; replies go on DashCentral), USD amounts, and the community layer (Advise and
  Against). A proposal's owner can list the project on Dash Alive with its own receiving address,
  so the community can support it directly. The DAO ballot itself stays masternode-only — never
  conflate the community layer with masternode votes.
- **The Support Pool** — dashsupport.team/reserve (also /pool, /contribute). Against, Advise and
  listing payments land there with direct contributions, at the reserve
  Xe5ZHYYTSo7UKEDyNGMwibnaNyKwiuiVZb (InstantSend; the page's wallet link opens a Dash wallet
  filled in). Every movement at the reserve is shown from the chain, and an outgoing transfer
  reads "not yet classified" until its purpose is documented. A contribution "isn't a vote on any
  project and doesn't buy a share of anything."
- **The Pool allocation policy (24 Sep 2026):** it funds a specific next step for a project
  listed on Dash Alive (a milestone, a fix, an audit); never the Dash Support Team's own project,
  and not the team's running costs unless that is announced separately first. The Dash Support
  Team's Director, who holds the reserve's key offline, approves each award (named on /reserve);
  anyone can recommend, through advice on Dash Alive or the Telegram group. Anyone with a stake in
  a project stays out of its decision. Awards come only from available funds; nothing is promised
  beyond what the Pool holds. The first review round opens when available funds reach 10 DASH,
  and reaching it spends nothing by itself. Every award is announced on The Pulse before any DASH
  moves, with the project, the reason, the amount, who approved it, the payment transaction and
  what was delivered; recommended, approved and paid show as separate steps.
- **Retired: the Dash Aligned score.** Until 24 Sep 2026 the Pool was to pay projects
  automatically in proportion to their Dash Aligned score, starting at 10 DASH. The Pool never
  reached 10 DASH, so nothing was paid or owed under that rule. Never present the score as how
  anything is decided now.
- **The privacy law:** nothing is public until a payment locks — unpaid invoices (addresses,
  names, drafts) wait in a private ledger and expire after 48h; expired unused addresses are
  recycled. Only real deposits are ever logged publicly. A listing publishes everything except
  its contact.
- **Custody:** the server holds a watch-only xpub only (it can never spend). The operator moves
  funds to the cold reserve by hand, signing offline, and the reserve's key never touches a
  server; accounting lives in ALIVE/TREASURY.md + treasury.json.
