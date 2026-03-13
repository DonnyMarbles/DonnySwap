/**
 * Deploy v3 tokenomics contracts to PEAQ mainnet.
 *
 * Deployment order (respects dependency chain):
 *   1. FeeManagerV2  (needs: DSFO placeholder, Router, Factory, Treasury)
 *   2. LPVault       (needs: MRBL-PEAQ LP, DSFO placeholder, FeeSplitter placeholder, FeeManager, Treasury)
 *   3. DSFONFTv3     (needs: MRBL-PEAQ LP, FeeManager, LPVault)
 *   4. FeeSplitter   (needs: Factory, FeeManager, LPVault, MRBL-PEAQ pair)
 *   5. Wire up: FeeManager.setDsfoToken, LPVault.setDsfoToken, LPVault.setFeeSplitter
 *   6. Factory.setFeeTo(feeSplitter)
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deploy-v3.cjs --network peaq --config hardhat.config.cjs
 *
 * Env vars (in .env):
 *   DEPLOYER_PRIVATE_KEY  — deployer wallet private key
 */
const hre = require("hardhat");

// ── Existing deployed addresses (PEAQ mainnet) ──
const FACTORY   = "0x60659f5997C8D58DC4E4dcC1bdB89E8f62Be40E6";
const ROUTER    = "0xBa6777062F71318de6b681370189055904e20D21";
const WPEAQ     = "0x3cD66d2e1fac1751B0A20BeBF6cA4c9699Bb12d7";
const MRBL      = "0xe488F2123f1bd88789817f09cd1989ec41Ae9baC";
const MRBL_PEAQ_PAIR = "0x6D4e72A465427b60EEd0F819e946d54A7FD98Bcd";

// ── Pricing config ──
// basePrice: 1 LP token (18 decimals)
const BASE_PRICE  = hre.ethers.parseEther("1");
// priceStep: 0.05 LP per active NFT
const PRICE_STEP  = hre.ethers.parseEther("0.05");
// Per-address mint cap (0 = unlimited at launch for founder minting, set after bootstrap)
const INITIAL_MINT_CAP = 0;

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasury = deployer.address; // Deployer = treasury initially (transfer to multisig later)

  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "PEAQ");
  console.log("---");

  // ── 1. FeeManagerV2 ──
  console.log("1/6 Deploying FeeManagerV2...");
  const FeeManagerV2 = await hre.ethers.getContractFactory("FeeManagerV2");
  // Use deployer as temporary DSFO token (will update after DSFO deploys)
  const feeManager = await FeeManagerV2.deploy(
    deployer.address, // temporary dsfoToken — updated in step 5
    ROUTER,
    FACTORY,
    treasury
  );
  await feeManager.waitForDeployment();
  const feeManagerAddr = await feeManager.getAddress();
  console.log("   FeeManagerV2:", feeManagerAddr);

  // ── 2. LPVault ──
  console.log("2/6 Deploying LPVault...");
  const LPVault = await hre.ethers.getContractFactory("LPVault");
  const lpVault = await LPVault.deploy(
    MRBL_PEAQ_PAIR,   // mrblPeaqLP
    deployer.address,  // temporary dsfoToken — updated in step 5
    deployer.address,  // temporary feeSplitter — updated in step 5
    feeManagerAddr,    // feeManager
    treasury           // treasury
  );
  await lpVault.waitForDeployment();
  const lpVaultAddr = await lpVault.getAddress();
  console.log("   LPVault:", lpVaultAddr);

  // ── 3. DSFONFTv3 ──
  console.log("3/6 Deploying DSFONFTv3...");
  const DSFONFTv3 = await hre.ethers.getContractFactory("DSFONFTv3");
  const dsfo = await DSFONFTv3.deploy(
    MRBL_PEAQ_PAIR,  // lpToken (MRBL-PEAQ LP)
    feeManagerAddr,  // feeManager
    lpVaultAddr,     // lpVault
    BASE_PRICE,      // basePrice
    PRICE_STEP       // priceStep
  );
  await dsfo.waitForDeployment();
  const dsfoAddr = await dsfo.getAddress();
  console.log("   DSFONFTv3:", dsfoAddr);

  // ── 4. FeeSplitter ──
  console.log("4/6 Deploying FeeSplitter...");
  const FeeSplitter = await hre.ethers.getContractFactory("FeeSplitter");
  const feeSplitter = await FeeSplitter.deploy(
    FACTORY,
    feeManagerAddr,
    lpVaultAddr,
    MRBL_PEAQ_PAIR
  );
  await feeSplitter.waitForDeployment();
  const feeSplitterAddr = await feeSplitter.getAddress();
  console.log("   FeeSplitter:", feeSplitterAddr);

  // ── 5. Wire up cross-references ──
  console.log("5/6 Wiring up cross-references...");

  // FeeManager: point to real DSFO token
  let tx = await feeManager.setDsfoToken(dsfoAddr);
  await tx.wait();
  console.log("   FeeManager.setDsfoToken ->", dsfoAddr);

  // LPVault: point to real DSFO token
  tx = await lpVault.setDsfoToken(dsfoAddr);
  await tx.wait();
  console.log("   LPVault.setDsfoToken ->", dsfoAddr);

  // LPVault: point to real FeeSplitter
  tx = await lpVault.setFeeSplitter(feeSplitterAddr);
  await tx.wait();
  console.log("   LPVault.setFeeSplitter ->", feeSplitterAddr);

  // Register MRBL-PEAQ LP in FeeManager so it can break it down
  tx = await feeManager.addLPTokenAddress(MRBL_PEAQ_PAIR);
  await tx.wait();
  console.log("   FeeManager.addLPTokenAddress ->", MRBL_PEAQ_PAIR);

  // Set initial mint cap (0 = unlimited for founder bootstrap)
  if (INITIAL_MINT_CAP > 0) {
    tx = await dsfo.setMaxMintsPerAddress(INITIAL_MINT_CAP);
    await tx.wait();
    console.log("   DSFO.setMaxMintsPerAddress ->", INITIAL_MINT_CAP);
  } else {
    console.log("   DSFO mint cap: UNLIMITED (founder bootstrap mode)");
  }

  // ── 6. Set Factory feeTo ──
  console.log("6/6 Setting Factory.setFeeTo...");
  const factoryAbi = ["function setFeeTo(address) external", "function feeToSetter() view returns (address)"];
  const factory = new hre.ethers.Contract(FACTORY, factoryAbi, deployer);

  const feeToSetter = await factory.feeToSetter();
  if (feeToSetter.toLowerCase() === deployer.address.toLowerCase()) {
    tx = await factory.setFeeTo(feeSplitterAddr);
    await tx.wait();
    console.log("   Factory.setFeeTo ->", feeSplitterAddr);
  } else {
    console.log("   WARNING: feeToSetter is", feeToSetter, "— cannot set feeTo from deployer.");
    console.log("   You must call Factory.setFeeTo(", feeSplitterAddr, ") from", feeToSetter);
  }

  // ── Summary ──
  console.log("\n════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("════════════════════════════════════════");
  console.log("  FeeManagerV2:", feeManagerAddr);
  console.log("  LPVault:     ", lpVaultAddr);
  console.log("  DSFONFTv3:   ", dsfoAddr);
  console.log("  FeeSplitter: ", feeSplitterAddr);
  console.log("════════════════════════════════════════");
  console.log("\nExisting (unchanged):");
  console.log("  Factory:     ", FACTORY);
  console.log("  Router:      ", ROUTER);
  console.log("  MRBL:        ", MRBL);
  console.log("  WPEAQ:       ", WPEAQ);
  console.log("  MRBL-PEAQ LP:", MRBL_PEAQ_PAIR);
  console.log("\nConfig:");
  console.log("  Treasury:    ", treasury, "(deployer — transfer to multisig!)");
  console.log("  Base price:  ", hre.ethers.formatEther(BASE_PRICE), "LP");
  console.log("  Price step:  ", hre.ethers.formatEther(PRICE_STEP), "LP per NFT");
  console.log("  Mint cap:    ", INITIAL_MINT_CAP === 0 ? "UNLIMITED (founder bootstrap)" : INITIAL_MINT_CAP + " per address");
  console.log("\nFounder bootstrap sequence:");
  console.log("  1. Seed liquidity: add MRBL+PEAQ to pool, get LP tokens");
  console.log("  2. Mint your DSFO NFTs (no cap while you're owner)");
  console.log("  3. Set mint cap: dsfo.setMaxMintsPerAddress(25)");
  console.log("  4. Open to community: distribute MRBL, announce minting");
  console.log("\nPost-bootstrap:");
  console.log("  5. Update frontend constants with new addresses");
  console.log("  6. Update feesListener_v2.js with new FeeManager address");
  console.log("  7. Transfer ownership to TimelockController");
  console.log("  4. Transfer treasury to multisig");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
