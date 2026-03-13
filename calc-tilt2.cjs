/**
 * Dynamic mintout simulation — MRBL appreciates as community buys from pool.
 *
 * Setup: Remove existing 70 LP, re-add at tilted ratio (5,987 MRBL + 10,000 PEAQ).
 * Founder mints 500 NFTs using the LP they created.
 *
 * Key insight: when community buys MRBL then re-deposits as liquidity,
 * MRBL reserve stays constant while PEAQ reserve grows.
 * → MRBL price monotonically increases with each mint.
 */

const PEAQ_USD = 0.013;
const BASE = 1.0;
const STEP = 0.05;

// ── Pool setup (post-tilt, post-founder-mint) ──
// Founder added 5,987 MRBL + 10,000 PEAQ → 6,737.5 LP → minted 500 DSFOs
const R_m = 5987;       // MRBL reserve (CONSTANT throughout community mints)
let R_p = 10000;        // PEAQ reserve (grows)
let S = 6737.5;         // LP supply (grows)

const milestones = [501, 550, 600, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 5450];
let cumPeaq = 0;

console.log("══════════════════════════════════════════════════════════════════════════════════");
console.log("  DYNAMIC MINT PRICING — MRBL appreciates as community buys from pool");
console.log("  Pool: 5,987 MRBL + 10,000 PEAQ │ PEAQ = $0.013 (constant)");
console.log("══════════════════════════════════════════════════════════════════════════════════\n");

console.log(" Mint # │ LP Price │  Mint Cost  │  USD Cost │ MRBL Price │ MRBL Price │ Cumul PEAQ");
console.log("        │   (LP)   │   (PEAQ)    │           │   (PEAQ)   │   (USD)    │   Spent");
console.log("────────┼──────────┼─────────────┼───────────┼────────────┼────────────┼──────────");

for (let n = 501; n <= 5450; n++) {
    const lp_cost = BASE + (n - 1) * STEP;

    // To create lp_cost LP, community member buys MRBL from pool then re-deposits.
    // mrbl_out = lp_cost * R_m / (S + lp_cost)
    const mrbl_out = lp_cost * R_m / (S + lp_cost);

    // PEAQ cost to swap for that MRBL (0.3% fee)
    const denom = 997 * (R_m - mrbl_out);
    if (denom <= 0) { console.log(`  MRBL exhausted at mint #${n}`); break; }
    const peaq_swap = mrbl_out * R_p * 1000 / denom;

    // Post-swap pool
    const R_p_post = R_p + peaq_swap;
    const R_m_post = R_m - mrbl_out;

    // PEAQ for adding liquidity (at post-swap ratio)
    const peaq_liq = mrbl_out * R_p_post / R_m_post;

    const total_peaq = peaq_swap + peaq_liq;
    const total_usd = total_peaq * PEAQ_USD;
    cumPeaq += total_peaq;

    // Update pool: R_m unchanged, R_p grows, S grows
    R_p = R_p_post + peaq_liq;
    S = S + lp_cost;

    if (milestones.includes(n)) {
        const mrbl_peaq = R_p / R_m;
        const mrbl_usd = mrbl_peaq * PEAQ_USD;
        console.log(
            ` ${String(n).padStart(5)}  │ ${lp_cost.toFixed(2).padStart(8)} │ ` +
            `${total_peaq.toFixed(1).padStart(11)} │ ` +
            `$${total_usd.toFixed(2).padStart(8)} │ ` +
            `${mrbl_peaq.toFixed(2).padStart(10)} │ ` +
            `$${mrbl_usd.toFixed(4).padStart(9)} │ ` +
            `${cumPeaq.toFixed(0).padStart(9)}`
        );
    }
}

const finalMrblPrice = R_p / R_m;

console.log("\n══════════════════════════════════════════════════════════════════════════════════");
console.log("  SUMMARY");
console.log("══════════════════════════════════════════════════════════════════════════════════");
console.log(`  MRBL price start:       1.67 PEAQ  ($0.0217)`);
console.log(`  MRBL price end:         ${finalMrblPrice.toFixed(2)} PEAQ  ($${(finalMrblPrice * PEAQ_USD).toFixed(4)})`);
console.log(`  MRBL appreciation:      ${(finalMrblPrice / 1.671).toFixed(1)}x`);
console.log();
console.log(`  Founder (500 mints):    10,000 PEAQ   ($130)`);
console.log(`  Community (4,950):      ${cumPeaq.toLocaleString(undefined, {maximumFractionDigits: 0})} PEAQ   ($${(cumPeaq * PEAQ_USD).toLocaleString(undefined, {maximumFractionDigits: 0})})`);
console.log(`  Community / Founder:    ${(cumPeaq / 10000).toFixed(0)}x more PEAQ spent`);
console.log();
console.log(`  Avg founder mint:       20 PEAQ ($0.26)`);
console.log(`  Avg community mint:     ${(cumPeaq / 4950).toFixed(1)} PEAQ ($${(cumPeaq / 4950 * PEAQ_USD).toFixed(2)})`);
console.log(`  First community mint:   ~77 PEAQ ($1.00) — 3.9x founder avg`);
console.log();

// LP burn stats
const totalLPCreated = S;
const burnedLP = totalLPCreated * 0.70;
console.log(`  LP burned (0xdead):     ${burnedLP.toLocaleString(undefined, {maximumFractionDigits: 0})} (70% of ${totalLPCreated.toLocaleString(undefined, {maximumFractionDigits: 0})} total)`);
console.log(`  PEAQ locked forever:    ${(burnedLP / totalLPCreated * R_p).toLocaleString(undefined, {maximumFractionDigits: 0})} PEAQ ($${(burnedLP / totalLPCreated * R_p * PEAQ_USD).toLocaleString(undefined, {maximumFractionDigits: 0})})`);

// Sensitivity
console.log("\n══════════════════════════════════════════════════════════════════════════════════");
console.log("  IF PEAQ = $0.05 (3.85x current)");
console.log("══════════════════════════════════════════════════════════════════════════════════");
console.log(`  Founder cost:           $${(10000 * 0.05).toLocaleString()}`);
console.log(`  Avg community mint:     $${(cumPeaq / 4950 * 0.05).toFixed(2)}`);
console.log(`  MRBL end price:         $${(finalMrblPrice * 0.05).toFixed(4)}`);
console.log(`  Community total:        $${(cumPeaq * 0.05).toLocaleString(undefined, {maximumFractionDigits: 0})}`);

console.log("\n══════════════════════════════════════════════════════════════════════════════════");
console.log("  IF PEAQ = $0.10 (7.7x current)");
console.log("══════════════════════════════════════════════════════════════════════════════════");
console.log(`  Founder cost:           $${(10000 * 0.10).toLocaleString()}`);
console.log(`  Avg community mint:     $${(cumPeaq / 4950 * 0.10).toFixed(2)}`);
console.log(`  MRBL end price:         $${(finalMrblPrice * 0.10).toFixed(4)}`);
console.log(`  Community total:        $${(cumPeaq * 0.10).toLocaleString(undefined, {maximumFractionDigits: 0})}`);
