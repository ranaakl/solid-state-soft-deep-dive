import type { DeepDiveSpec, DomainOption, PresetScenario } from "../types/spec";

export const DOMAIN_OPTIONS: DomainOption[] = [
  "E-Commerce & Drops",
  "Fintech & Payments",
  "B2B SaaS / Operations",
  "Healthcare / Booking",
];

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "sneaker-drop",
    number: "1",
    label: "Limited-Edition Sneaker Drop",
    shortTag: "High-concurrency inventory & bot mitigation",
    domain: "E-Commerce & Drops",
    brief: `We're launching a 500-pair collab sneaker drop next month at 10:00 AM EST. VIP loyalty members get 15 minutes early access, then it opens to the public. Strict limit of 1 pair per customer (people keep spinning up alt accounts and forwarding addresses to scalp).

When someone adds a size to cart, we want to hold it for 7 minutes while they check out with Apple Pay or credit card. Last drop we oversold size 10 by 19 pairs because Stripe webhooks came in slow and Shopify inventory synced every 30 seconds. Also, if a VIP checks out at 9:59 AM and their card fails 3DS, they shouldn't lose their spot immediately, or maybe they should if stock is low? Oh, and marketing wants a waitlist auto-notify if carts expire, plus support needs to cancel suspected bot orders before the 3PL warehouse prints shipping labels at 11:00 AM.`,
  },
  {
    id: "invoice-approval",
    number: "2",
    label: "Multi-Tier Invoice Approval",
    shortTag: "Delegated RBAC, PO matching & ERP sync",
    domain: "B2B SaaS / Operations",
    brief: `Enterprise customers upload vendor PDFs or forward invoices via email into our AP portal. We extract line items and match them against Purchase Orders. Under $5,000 auto-approves if it matches the PO within 2% variance. $5,000–$25,000 needs Department Head approval. Over $25,000 requires Department Head AND VP Finance in sequence, unless it's a recurring SaaS vendor where Finance wants to sign off in parallel.

Messy reality: managers go on PTO and delegate approval to peers, sometimes creating circular delegations or approving their own department's unbudgeted spend. Vendors also resend corrected PDFs with the same invoice number while approval is already halfway done. Once approved, we push the bill to NetSuite/QuickBooks—if the ERP is down or the accounting period is already closed for the month, finance shouldn't end up with duplicate bills or silent failures.`,
  },
  {
    id: "payout-reconciliation",
    number: "3",
    label: "Automated Payout Reconciliation",
    shortTag: "Split ledgers, ACH timing & clawbacks",
    domain: "Fintech & Payments",
    brief: `Our B2B marketplace collects buyer card and ACH payments, takes a 3.5% platform fee plus dynamic shipping/tax splits, and pays out sellers every Tuesday and Friday via Stripe Connect / ACH. Buyers can open partial disputes or request line-item refunds up to 30 days after delivery—even after the seller has already been paid out.

Right now ops spends 12 hours a week reconciling bank settlement files against our internal Postgres tables because ACH returns (R01 insufficient funds) arrive 3–5 business days later, payouts initiated before bank holidays shift settlement dates, and Stripe splits occasionally round off by 1 cent across multi-seller carts. If a seller's balance goes negative from a chargeback, we want to auto-net against upcoming payouts or debit their linked bank account after 14 days, without accidentally freezing payouts for unrelated sub-merchants.`,
  },
];

export const INITIAL_SAMPLE_SPEC: DeepDiveSpec = {
  specTitle: "Limited-Edition Sneaker Drop",
  domain: "E-Commerce & Drops",
  generatedAt: "2026-11-25T16:30:00.000Z",
  isSample: true,
  userStories: [
    {
      id: "US-01",
      role: "verified VIP loyalty member",
      action:
        "receive server-enforced early access to the 500-pair drop catalog starting at 09:45 AM EST via a signed session token",
      benefit:
        "I can reserve and check out during the 15-minute early access window before public traffic opens at 10:00 AM EST.",
    },
    {
      id: "US-02",
      role: "drop shopper selecting an available shoe size",
      action:
        "atomically lock 1 unit of my chosen SKU for a strict 7-minute checkout hold",
      benefit:
        "my pair cannot be oversold to another concurrent buyer while I complete Apple Pay or 3DS card authentication.",
    },
    {
      id: "US-03",
      role: "drop operations manager",
      action:
        "enforce a strict 1-pair-per-customer cap across account ID, Stripe card fingerprint, and CASS-normalized shipping address",
      benefit:
        "scalper bots spinning up alt accounts and jigged addresses are blocked before payment capture.",
    },
    {
      id: "US-04",
      role: "VIP or public buyer whose initial 3DS check fails",
      action:
        "retry payment or switch payment methods up to 3 times without forfeiting my reserved unit inside the original 7-minute TTL",
      benefit:
        "transient issuer friction does not eject legitimate buyers while still preventing indefinite cart squatting.",
    },
    {
      id: "US-05",
      role: "fraud and support analyst",
      action:
        "review all confirmed orders in an 'Awaiting 3PL Release' hold state and void suspected bot orders prior to 11:00 AM EST",
      benefit:
        "fraudulent orders are canceled and returned to waitlist stock before the 3PL prints irrevocable shipping labels.",
    },
  ],
  acceptanceCriteria: [
    {
      storyId: "US-02",
      given:
        "SKU 'COLLAB-SNK-10' has exactly 1 available unit in the atomic Redis/Postgres inventory ledger and 50 authenticated buyers request Size 10 within 100ms",
      when: "the reservation service executes atomic inventory allocation for all 50 requests",
      then: "exactly 1 buyer receives HTTP 201 with a 420-second reservation token, 49 buyers receive HTTP 409 with a waitlist opt-in prompt, and available stock equals 0 with zero negative balance",
    },
    {
      storyId: "US-02",
      given:
        "reservation 'RES-8841' for Size 10 expired at 10:07:00 EST and the expiry sweeper returned the unit to available stock at 10:07:02 EST",
      when: "a delayed Stripe 'payment_intent.succeeded' webhook arrives for 'RES-8841' at 10:07:15 EST",
      then: "the webhook handler checks reservation state inside a serializable transaction, detects status EXPIRED, triggers an idempotent full refund if stock is 0, and creates no oversold order",
    },
    {
      storyId: "US-03",
      given:
        "account #104 has already purchased 1 pair in the active drop and alternate account #992 attempts checkout using a jigged variation of the same normalized street/unit address or the same card fingerprint",
      when: "account #992 submits payment confirmation",
      then: "the risk engine rejects the transaction before capture with code 'DROP_LIMIT_EXCEEDED', immediately releases the held SKU back to stock, and logs an audit entry",
    },
    {
      storyId: "US-04",
      given:
        "VIP buyer B created reservation 'RES-2109' at 09:56:00 EST expiring at 10:03:00 EST and failed 3DS verification at 09:59:10 EST",
      when: "buyer B retries with Apple Pay at 10:00:45 EST using the same reservation token",
      then: "the hold remains valid across the 10:00 AM public boundary until 10:03:00 EST without extending TTL, payment succeeds, and the order enters 'AWAITING_3PL_RELEASE'",
    },
    {
      storyId: "US-05",
      given:
        "order 'ORD-7712' is in 'AWAITING_3PL_RELEASE' state at 10:42 AM EST and a support analyst confirms bot abuse",
      when: "the analyst triggers 'Cancel & Void' before the 11:00 AM EST 3PL manifest job runs",
      then: "the order transitions to 'CANCELLED_FRAUD', is excluded from the 3PL batch export, an idempotent Stripe void/refund executes, and 1 unit returns to the waitlist pool",
    },
  ],
  edgeCases: [
    {
      severity: "Critical",
      scenario:
        "Buyer submits Apple Pay at 6m 59s into the 7-minute hold while the expiry sweeper runs at 7m 00s and reclaims the unit.",
      failureMode:
        "Double-capture race condition: payment settles for Buyer A while Buyer B simultaneously reserves and pays for the reclaimed last pair, overselling Size 10.",
      recommendedSafeguard:
        "Enforce a two-phase state machine (RESERVED → CAPTURING → CONFIRMED) with a 30-second capture grace buffer before reclamation; auto-void authorization if the reservation already transitioned to EXPIRED.",
    },
    {
      severity: "Critical",
      scenario:
        "Shopify's 30-second background inventory sync runs mid-drop while the reservation engine is actively decrementing stock.",
      failureMode:
        "Stale Shopify counts overwrite live drop inventory, reopening sold-out sizes and causing multi-pair oversells like the previous 19-pair incident.",
      recommendedSafeguard:
        "Designate the drop reservation service (Redis Lua + Postgres ledger) as the sole write authority during the drop window; disable inbound Shopify inventory overwrites and push finalized order decrements asynchronously.",
    },
    {
      severity: "Critical",
      scenario:
        "Stripe delivers duplicate or out-of-order webhooks (e.g., 'payment_intent.succeeded' twice or after a cancellation event).",
      failureMode:
        "Duplicate order creation, double inventory decrements, or reviving a fraud-canceled order into the 3PL manifest.",
      recommendedSafeguard:
        "Store processed Stripe event IDs with a UNIQUE constraint in Postgres and enforce monotonic finite-state transitions so terminal states (EXPIRED, CANCELLED_FRAUD) can never regress.",
    },
    {
      severity: "High",
      scenario:
        "Headless bots open 500 concurrent checkout sessions at 10:00:00 AM solely to lock all 500 pairs in 7-minute holds without paying.",
      failureMode:
        "Denial-of-inventory attack locks out every legitimate buyer for repeated 7-minute waves while conversion drops to near zero.",
      recommendedSafeguard:
        "Require verified account login plus Turnstile/WebAuthn proof-of-humanity and pre-validated payment intent creation before issuing a 7-minute inventory hold; cap concurrent active holds per IP/subnet heuristic.",
    },
    {
      severity: "High",
      scenario:
        "Support analyst clicks 'Cancel Bot Order' at 10:59:59 AM while the 11:00 AM 3PL batch export job is querying releasable orders.",
      failureMode:
        "Order is refunded in Stripe while the 3PL simultaneously receives the shipping manifest and ships free sneakers.",
      recommendedSafeguard:
        "Use row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) when transitioning orders from `AWAITING_3PL_RELEASE` to `DISPATCHING_3PL`; reject concurrent cancellations with a clear warehouse-recall prompt.",
    },
    {
      severity: "Medium",
      scenario:
        "Waitlist auto-notify blasts 10,000 subscribers immediately when 2 expired carts free up.",
      failureMode:
        "Thundering-herd traffic spike degrades checkout latency and creates a poor UX for 9,998 recipients who land on an already sold-out SKU.",
      recommendedSafeguard:
        "Dispatch waitlist notifications in FIFO micro-waves (5x released units per batch) with tokenized 5-minute claim links and a 2-minute inter-wave cooldown.",
    },
    {
      severity: "Medium",
      scenario:
        "Drop launch time ('10:00 AM EST') spans a Daylight Saving Time transition or international client clocks drift.",
      failureMode:
        "Countdown timers unlock prematurely or lock out shoppers for an hour due to EST/EDT confusion or local device clock skew.",
      recommendedSafeguard:
        "Store launch schedules in canonical IANA timezone (`America/New_York`) resolved to server UTC epoch, driving all client countdowns from server-returned remaining milliseconds.",
    },
  ],
  architectureGaps: [
    {
      title: "Immediate Payment Capture vs. Auth-Only Until 11:00 AM Fraud Cutoff",
      risk:
        "The brief requires support to cancel bot orders before 11:00 AM EST but omits capture timing. Immediate capture incurs non-refundable ~2.9% Stripe processing fees on every canceled bot order and delays buyer refunds 5–10 days for false positives.",
      recommendation:
        "Use Stripe manual capture (authorize at checkout, batch-capture at 11:00 AM upon 3PL release) so voided bot orders release the hold with zero processing fees. Confirm with Finance that Apple Pay and debit issuers in target regions support 1-hour delayed capture.",
    },
    {
      title: "Shopify Checkout vs. Custom Headless Allocation Authority",
      risk:
        "If buyers complete checkout natively inside Shopify Checkout, Shopify's eventual-consistency inventory sync will bypass custom 7-minute hold locks and reintroduce oversells under burst concurrency.",
      recommendation:
        "Host the drop checkout flow on a dedicated edge reservation gate backed by Redis + Stripe Payment Intents, syncing only finalized post-allocation orders downstream to Shopify for ERP/accounting visibility.",
    },
    {
      title: "Shared-Address False Positives for Households and Offices",
      risk:
        "A rigid '1 pair per shipping address' rule blocks scalper address-jigging but also silently blocks roommates, dorm residents, or two legitimate VIP coworkers shipping to the same office building.",
      recommendation:
        "Score composite identity signals (account ID, card fingerprint, device hash, normalized street/unit). Hard-block exact account or card reuse; route address-only collisions to the 10:00–11:00 AM manual support review queue instead of auto-rejecting.",
    },
    {
      title: "VIP Early Access Stock Partitioning vs. Uncapped Sellout",
      risk:
        "Granting VIPs a 15-minute head start on all 500 pairs without a VIP stock cap allows VIPs to exhaust 100% of inventory by 09:50 AM, leaving public launch marketing campaigns pointing to an empty drop at 10:00 AM.",
      recommendation:
        "Partition inventory into explicit buckets (e.g., 200 pairs allocated to VIP early access, 300 pairs guaranteed for the 10:00 AM public release), automatically rolling any unsold VIP units into the public pool at 10:00:00 AM.",
    },
    {
      title: "Waitlist Cutoff Before the 11:00 AM 3PL Label Generation Window",
      risk:
        "Automatically notifying waitlist users when fraud orders are canceled at 10:52 AM creates brand-new orders right before the 11:00 AM warehouse cutoff with no time for fraud review.",
      recommendation:
        "Restrict automatic waitlist release to expired carts occurring before 10:30 AM EST, and pool all fraud-canceled stock into a scheduled 12:00 PM second-chance drop with its own review window.",
    },
  ],
};
