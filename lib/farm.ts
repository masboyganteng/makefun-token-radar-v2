// lib/farm.ts — farm plans for the token launch radar (round 2 rebuild).
//
// Written from scratch from the build plan's research notes. Plans are
// concrete: an action, what it costs and how long it takes. Nothing here
// promises an airdrop or a token launch: the language is always "records
// no token" and "if there is a points/rewards program".
//
// The top-40 watchlist protocols get a per-protocol profile (product,
// asset, venue) from the plan's research; every other row gets a
// category-derived plan that still names the protocol, its main chain and
// its actual product type.

import type { ScoredRow } from "./model.ts";

interface Profile {
  kind: string;
  product: string;
  asset: string;
  venue: string;
}

// Per-protocol research profiles for the watchlist, from the build plan.
const WATCHLIST_PROFILES: Record<string, Profile> = {
  "steakhouse-financial": { kind: "curator", product: "Steakhouse vaults", asset: "USDC", venue: "Morpho and Euler" },
  "gauntlet": { kind: "curator", product: "Gauntlet vaults", asset: "USDC", venue: "Morpho and Aave" },
  "veda": { kind: "allocator", product: "Veda-powered vaults (Boyco and similar)", asset: "USDC", venue: "the chain's active Veda vaults" },
  "usdd": { kind: "cdp", product: "USDD", asset: "USDD", venue: "Tron and Ethereum DeFi" },
  "upshift": { kind: "allocator", product: "Upshift vaults", asset: "USDC", venue: "Upshift" },
  "nonce-capital": { kind: "curator", product: "Nonce Capital vaults", asset: "USDC", venue: "Morpho and Euler" },
  "onre": { kind: "rwa", product: "OnRe yield-bearing RWA", asset: "USDC", venue: "OnRe" },
  "bittensor-dtao": { kind: "subnet", product: "dTAO subnets", asset: "TAO", venue: "Bittensor" },
  "symbiotic": { kind: "restaking", product: "Symbiotic vaults", asset: "stETH or wstETH", venue: "Symbiotic" },
  "opentrade": { kind: "rwa", product: "OpenTrade yield RWA", asset: "USDC", venue: "OpenTrade" },
  "rockawayx": { kind: "curator", product: "RockawayX vaults", asset: "USDC", venue: "Morpho and Euler" },
  "plume-vaults": { kind: "rwa", product: "Plume Vaults", asset: "USDC", venue: "Plume" },
  "hive-protocol": { kind: "chain", product: "Hive network", asset: "HIVE", venue: "Hive" },
  "hyperithm": { kind: "curator", product: "Hyperithm vaults", asset: "USDC", venue: "Morpho and Euler" },
  "k3-capital": { kind: "curator", product: "K3 Capital vaults", asset: "USDC", venue: "Morpho and Euler" },
  "clearstar": { kind: "curator", product: "Clearstar vaults", asset: "USDC", venue: "Morpho and Euler" },
  "lightning-network": { kind: "payments", product: "Lightning Network", asset: "BTC", venue: "Lightning" },
  "r25": { kind: "rwa", product: "R25 yield RWA", asset: "USDC", venue: "R25" },
  "lofty": { kind: "rwa", product: "Lofty tokenised real estate", asset: "USDC", venue: "Lofty" },
  "valos": { kind: "rwa", product: "Valos yield RWA", asset: "USDC", venue: "Valos" },
  "ember": { kind: "rwa", product: "Ember yield RWA", asset: "USDC", venue: "Ember" },
  "b14g": { kind: "restaking", product: "b14g restaking vaults", asset: "stETH or wstETH", venue: "b14g" },
  "lagoon": { kind: "allocator", product: "Lagoon vaults", asset: "USDC", venue: "Lagoon" },
  "saturn": { kind: "wrapper", product: "Saturn wrapped stablecoin", asset: "USDC", venue: "Saturn" },
  "curvance": { kind: "lending", product: "Curvance lending markets", asset: "USDC or ETH", venue: "Curvance" },
  "tydro": { kind: "lending", product: "Tydro lending markets", asset: "USDC or ETH", venue: "Tydro" },
  "galaxy-curation": { kind: "curator", product: "Galaxy Curation vaults", asset: "USDC", venue: "Morpho and Euler" },
  "armitage-by-wintermute": { kind: "curator", product: "Armitage by Wintermute vaults", asset: "USDC", venue: "Morpho and Euler" },
  "gami-labs": { kind: "curator", product: "Gami Labs vaults", asset: "USDC", venue: "Morpho and Euler" },
  "tulipa-capital": { kind: "curator", product: "Tulipa Capital vaults", asset: "USDC", venue: "Morpho and Euler" },
  "keyrock": { kind: "curator", product: "Keyrock curated vaults", asset: "USDC", venue: "Arc and Ethereum" },
  "doppler-finance": { kind: "cedefi", product: "Doppler Finance strategies", asset: "USDC", venue: "Doppler Finance" },
  "noble": { kind: "chain", product: "Noble network", asset: "USDC", venue: "Noble" },
  "tori-finance": { kind: "basis", product: "Tori Finance basis strategies", asset: "USDC", venue: "Tori Finance" },
  "axis": { kind: "basis", product: "Axis basis strategies", asset: "USDC", venue: "Axis" },
  "infinifi": { kind: "yield", product: "Infinifi yield strategies", asset: "USDC", venue: "Infinifi" },
  "yuzu-money": { kind: "yield", product: "Yuzu Money yield strategies", asset: "USDC", venue: "Yuzu Money" },
  "reti-pooling": { kind: "stakingpool", product: "Reti Pooling", asset: "staking asset", venue: "Reti Pooling" },
  "mezo-earn": { kind: "governance", product: "Mezo Earn", asset: "BTC", venue: "Mezo" },
  "firelight": { kind: "insurance", product: "Firelight cover", asset: "USDC", venue: "Firelight" },
};

// Honest notes shown in the detail view for protocols whose record needs
// care. Never a launch promise.
export const SPECIAL_NOTES: Record<string, string> = {
  "usdd":
    "USDD is a stablecoin that already circulates widely. Its implied value here is a model claim about the protocol's scale, not a claim that a new token will launch.",
  "bittensor-dtao":
    "TAO itself already trades. dTAO is Bittensor's subnet mechanism, so farming here means participating in subnets, not waiting on a first token.",
  "lightning-network":
    "The Lightning Network is payment infrastructure, not a protocol with a token launch on the horizon. Farming here means running a node or opening channels and earning routing fees.",
  "noble":
    "Noble is chain-level issuance infrastructure. A token launch is not the usual pattern here; farming means using the network and holding its native assets.",
  "hive-protocol":
    "Hive is chain-level infrastructure. Farming means using the network itself; do not expect a new token from it.",
};

function profileFor(row: ScoredRow): Profile {
  const known = WATCHLIST_PROFILES[row.slug];
  if (known) return known;
  const name = row.name;
  switch (row.category) {
    case "Risk Curators":
      return { kind: "curator", product: name + " vaults", asset: "USDC", venue: "Morpho or Euler" };
    case "Onchain Capital Allocator":
      return { kind: "allocator", product: name + " vaults", asset: "USDC", venue: name };
    case "RWA":
      return { kind: "rwa", product: name + " yield-bearing RWA", asset: "USDC", venue: name };
    case "Lending":
      return { kind: "lending", product: name + " lending markets", asset: "USDC or ETH", venue: name };
    case "Dexs":
      return { kind: "dex", product: name + " liquidity pools", asset: "USDC and the paired asset", venue: name };
    case "Yield":
    case "Yield Aggregator":
      return { kind: "yield", product: name + " yield strategies", asset: "USDC", venue: name };
    case "Restaking":
    case "Collateral Markets":
      return { kind: "restaking", product: name + " vaults", asset: "stETH or wstETH", venue: name };
    case "Chain":
      return { kind: "chain", product: name + " network", asset: "the native asset", venue: name };
    case "CDP":
      return { kind: "cdp", product: name, asset: "collateral such as ETH", venue: name };
    case "Basis Trading":
      return { kind: "basis", product: name + " basis strategies", asset: "USDC", venue: name };
    case "Payments":
      return { kind: "payments", product: name, asset: "the native asset", venue: name };
    case "Insurance":
      return { kind: "insurance", product: name + " cover", asset: "USDC", venue: name };
    case "Stablecoin Wrapper":
      return { kind: "wrapper", product: name, asset: "USDC", venue: name };
    case "Staking Pool":
      return { kind: "stakingpool", product: name + " pool", asset: "staking asset", venue: name };
    case "Governance Incentives":
      return { kind: "governance", product: name + " earn product", asset: "the governance asset", venue: name };
    case "CeDeFi":
      return { kind: "cedefi", product: name + " strategies", asset: "USDC", venue: name };
    default:
      return { kind: "generic", product: name + " core product", asset: "USDC", venue: name };
  }
}

// The core action (step 2) and the deepen step (step 3), per product kind.
function coreSteps(p: Profile, chain: string): [string, string] {
  switch (p.kind) {
    case "curator":
    case "allocator":
      return [
        `Deposit ${p.asset} into ${p.product} on ${p.venue} (${chain}); start with a small test deposit, confirm the vault receipt, then scale to your planned size. Cost: deposit plus gas. Time: 20 minutes.`,
        `Spread a second deposit across another vault from the same curator on a different market so one vault is not your whole position, and compare their yields after a week. Cost: deposit plus gas. Time: 20 minutes.`,
      ];
    case "rwa":
      return [
        `Mint or hold ${p.product} on ${p.venue} (${chain}) with ${p.asset}; start small, confirm the yield accrues to your wallet, then add to the position. Cost: purchase plus gas. Time: 25 minutes.`,
        `Hold the position for at least a full yield cycle and check the underlying asset backing on the project's page before adding more capital. Cost: no extra fee. Time: 15 minutes a week.`,
      ];
    case "lending":
      return [
        `Supply ${p.asset} to ${p.product} on ${p.venue} (${chain}); start with a test supply, confirm interest starts accruing, then scale up. Cost: deposit plus gas. Time: 20 minutes.`,
        `Borrow a small amount against your supply to test the borrow market, keep the health factor high, and repay promptly if rates spike. Cost: borrow interest plus gas. Time: 20 minutes.`,
      ];
    case "dex":
      return [
        `Provide liquidity to ${p.product} on ${p.venue} (${chain}) with ${p.asset}; start with a modest size, confirm the LP receipt, and watch impermanent loss for a week. Cost: deposit plus gas. Time: 25 minutes.`,
        `Add a second pool on the same venue with a different pair to diversify, and collect or compound the trading fees weekly. Cost: deposit plus gas. Time: 20 minutes.`,
      ];
    case "restaking":
      return [
        `Restake ${p.asset} through ${p.product} on ${p.venue} (${chain}); start small, confirm the restaked receipt, then scale to your planned size. Cost: deposit plus gas. Time: 25 minutes.`,
        `Check which operators and vaults your restaked assets secure, and move part of the position if a vault's terms or rewards change. Cost: gas only. Time: 15 minutes a week.`,
      ];
    case "chain":
      return [
        `Use ${p.product} on ${p.venue} (${chain}): bridge in ${p.asset}, make a real transaction, and keep a working balance on the network. Cost: bridge fee plus gas. Time: 30 minutes.`,
        `Become a regular user of the network for a month: repeat real transactions weekly so your usage is steady rather than a single burst. Cost: gas per transaction. Time: 10 minutes a week.`,
      ];
    case "payments":
      return [
        `Open a payment channel on ${p.product} (${chain}) funded with ${p.asset}; keep it open and balanced so it can route payments. Cost: channel open fee plus gas. Time: 30 minutes.`,
        `Run a node or keep the channel online for several weeks and monitor routing fees; close and reopen channels that never route. Cost: hosting or uptime only. Time: 15 minutes a week.`,
      ];
    case "cdp":
      return [
        `Mint the stablecoin via ${p.product} on ${p.venue} (${chain}) against ${p.asset}; keep the collateral ratio well above the liquidation line. Cost: mint fee plus gas. Time: 25 minutes.`,
        `Use the minted stablecoin in a low-risk venue such as a lending market, and top up collateral promptly if the ratio falls. Cost: gas per action. Time: 15 minutes a week.`,
      ];
    case "basis":
      return [
        `Run ${p.product} on ${p.venue} (${chain}) with ${p.asset}; start with a small allocation, confirm the strategy executes, then scale up. Cost: deposit plus gas. Time: 30 minutes.`,
        `Track the funding and basis spread weekly and pause the strategy if the spread turns negative for more than a few days. Cost: no extra fee. Time: 15 minutes a week.`,
      ];
    case "yield":
      return [
        `Deposit ${p.asset} into ${p.product} on ${p.venue} (${chain}); start small, confirm the yield receipt, then scale to your planned size. Cost: deposit plus gas. Time: 20 minutes.`,
        `Compare the strategy's yield against a plain lending market after two weeks, and move funds if it underperforms net of fees. Cost: gas only. Time: 15 minutes a week.`,
      ];
    case "insurance":
      return [
        `Buy cover through ${p.product} on ${p.venue} (${chain}) for a position you actually hold, or provide cover capital if you understand the risk. Cost: premium plus gas. Time: 25 minutes.`,
        `Review the cover terms and expiry, renew before it lapses if you still hold the covered position, and claim promptly if an event occurs. Cost: renewal premium. Time: 15 minutes.`,
      ];
    case "wrapper":
      return [
        `Mint or wrap ${p.asset} via ${p.product} on ${p.venue} (${chain}); start with a small amount, confirm the wrapped receipt, then scale up. Cost: mint fee plus gas. Time: 20 minutes.`,
        `Use the wrapped asset in a lending or liquidity venue and track its peg weekly; unwrap if the peg slips. Cost: gas per action. Time: 15 minutes a week.`,
      ];
    case "stakingpool":
      return [
        `Stake through ${p.product} on ${p.venue} (${chain}); start with a test stake, confirm the receipt and reward rate, then scale up. Cost: stake plus gas. Time: 20 minutes.`,
        `Compound or claim the staking rewards on a regular schedule and check the pool's validator set before adding more. Cost: gas per claim. Time: 10 minutes a week.`,
      ];
    case "governance":
      return [
        `Use ${p.product} on ${p.venue} (${chain}) with ${p.asset}; complete the earn actions it lists and confirm each one is recorded. Cost: deposit plus gas. Time: 25 minutes.`,
        `Take part in the governance actions the product rewards, such as voting, and keep a record of every vote and reward. Cost: gas per vote. Time: 15 minutes a week.`,
      ];
    case "subnet":
      return [
        `Stake ${p.asset} to a ${p.product} subnet on ${p.venue} (${chain}); research the subnet first, start small, and confirm the stake is registered. Cost: stake plus gas. Time: 30 minutes.`,
        `Track the subnet's emissions and performance for a few weeks, and reallocate the stake if another subnet earns consistently more. Cost: gas per move. Time: 15 minutes a week.`,
      ];
    case "cedefi":
      return [
        `Deposit ${p.asset} into ${p.product} on ${p.venue} (${chain}); start small, confirm the deposit receipt, then scale to your planned size. Cost: deposit plus gas. Time: 25 minutes.`,
        `Check the strategy's reported yield and custody setup weekly, and withdraw if the terms change without a clear explanation. Cost: gas only. Time: 15 minutes a week.`,
      ];
    default:
      return [
        `Use ${p.product} on ${p.venue} (${chain}) with ${p.asset}; start with a small amount, confirm the action is recorded, then scale up. Cost: deposit plus gas. Time: 25 minutes.`,
        `Repeat the core action weekly so your usage is steady, and check the project's official pages for any points or rewards program. Cost: gas per action. Time: 15 minutes a week.`,
      ];
  }
}

export function farmSteps(row: ScoredRow): string[] {
  const p = profileFor(row);
  const chain = row.chains.length > 0 ? row.chains[0] : "Ethereum";
  const [core, deepen] = coreSteps(p, chain);
  const name = row.name;

  const setup =
    row.tokenStatus === "trading"
      ? `Set up a fresh wallet for ${name} and fund it with a small test amount on ${chain}; its token already trades, so this is about using the product, not farming a launch. Cost: gas only. Time: 15 minutes.`
      : `Set up a fresh wallet for ${name} and fund it with ${p.asset} on ${chain}; keep gas aside and never share your seed phrase. Cost: gas only. Time: 15 minutes.`;

  const watch =
    row.tokenStatus === "trading"
      ? `Check the position weekly: track yield, TVL and fees, and compare the token's market value against the protocol's TVL to judge whether the product still earns its keep. Time: 10 minutes a week.`
      : `Check the position weekly: track yield, TVL and the project's official pages; if there is a points or rewards program, confirm your activity is recorded. Time: 10 minutes a week.`;

  const steps = [
    setup,
    core,
    deepen,
    watch,
    `Log every transaction hash, amount and date in a farm log and verify each deposit on the block explorer for ${chain}. Time: 5 minutes per action.`,
    row.tokenStatus === "trading"
      ? `Know the exit before you enter: ${p.product} lets you withdraw when you choose, so pull funds if the yield no longer justifies the risk or the token's value falls. Cost: gas only.`
      : `Know the exit before you enter: ${p.product} lets you withdraw when you choose, so pull funds if the program ends, the yield fades, or the risk no longer justifies the position. Cost: gas only.`,
  ];
  return steps.map((s) => s.trim());
}
