/**
 * Remove ALL liquidity the deployer holds from the MRBL-PEAQ pool.
 *
 * Usage:
 *   npx hardhat run scripts/deploy/remove-liquidity.cjs --network peaq --config hardhat.config.cjs
 */
const hre = require("hardhat");

// ── Addresses ──
const ROUTER         = "0xBa6777062F71318de6b681370189055904e20D21";
const MRBL_PEAQ_PAIR = "0x6D4e72A465427b60EEd0F819e946d54A7FD98Bcd";
const MRBL           = "0xe488F2123f1bd88789817f09cd1989ec41Ae9baC";
const WPEAQ          = "0x3cD66d2e1fac1751B0A20BeBF6cA4c9699Bb12d7";

// ── Minimal ABIs ──
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const ROUTER_ABI = [
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)",
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "PEAQ\n");

  // ── Contracts ──
  const lpToken = new hre.ethers.Contract(MRBL_PEAQ_PAIR, ERC20_ABI, deployer);
  const router  = new hre.ethers.Contract(ROUTER, ROUTER_ABI, deployer);
  const mrbl    = new hre.ethers.Contract(MRBL, ERC20_ABI, deployer);
  const wpeaq   = new hre.ethers.Contract(WPEAQ, ERC20_ABI, deployer);

  // ── 1. Check LP balance ──
  const lpBalance = await lpToken.balanceOf(deployer.address);
  console.log("LP token balance:", hre.ethers.formatEther(lpBalance), "LP");

  if (lpBalance === 0n) {
    console.log("\nNo LP tokens to remove. Exiting.");
    return;
  }

  // ── 2. Record token balances before removal ──
  const mrblBefore  = await mrbl.balanceOf(deployer.address);
  const wpeaqBefore = await wpeaq.balanceOf(deployer.address);

  // ── 3. Approve router to spend LP tokens ──
  const currentAllowance = await lpToken.allowance(deployer.address, ROUTER);
  if (currentAllowance < lpBalance) {
    console.log("\nApproving Router to spend", hre.ethers.formatEther(lpBalance), "LP tokens...");
    const approveTx = await lpToken.approve(ROUTER, lpBalance);
    await approveTx.wait();
    console.log("Approved. TX:", approveTx.hash);
  } else {
    console.log("\nRouter already has sufficient allowance.");
  }

  // ── 4. Remove liquidity ──
  const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  console.log("\nRemoving liquidity...");
  console.log("  tokenA (MRBL):", MRBL);
  console.log("  tokenB (WPEAQ):", WPEAQ);
  console.log("  liquidity:", hre.ethers.formatEther(lpBalance));
  console.log("  amountAMin: 0 (accept any)");
  console.log("  amountBMin: 0 (accept any)");
  console.log("  deadline:", deadline);

  const tx = await router.removeLiquidity(
    MRBL,
    WPEAQ,
    lpBalance,
    0,  // amountAMin — accept any
    0,  // amountBMin — accept any
    deployer.address,
    deadline
  );
  const receipt = await tx.wait();
  console.log("\nLiquidity removed! TX:", tx.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  // ── 5. Report tokens received ──
  const mrblAfter  = await mrbl.balanceOf(deployer.address);
  const wpeaqAfter = await wpeaq.balanceOf(deployer.address);

  const mrblReceived  = mrblAfter - mrblBefore;
  const wpeaqReceived = wpeaqAfter - wpeaqBefore;

  console.log("\n════════════════════════════════════════");
  console.log("  LIQUIDITY REMOVED SUCCESSFULLY");
  console.log("════════════════════════════════════════");
  console.log("  LP burned:      ", hre.ethers.formatEther(lpBalance));
  console.log("  MRBL received:  ", hre.ethers.formatEther(mrblReceived));
  console.log("  WPEAQ received: ", hre.ethers.formatEther(wpeaqReceived));
  console.log("════════════════════════════════════════");

  // Verify LP is now zero
  const lpAfter = await lpToken.balanceOf(deployer.address);
  console.log("\nRemaining LP balance:", hre.ethers.formatEther(lpAfter));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
