/**
 * Complete final wiring: Factory.setFeeTo -> FeeSplitter
 */
const hre = require("hardhat");

const FEE_SPLITTER = "0xe0a8AdBd3A9c780407A7993343589d7858CB1ba0";
const FACTORY = "0x60659f5997C8D58DC4E4dcC1bdB89E8f62Be40E6";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Account:", deployer.address);

  const factoryAbi = ["function setFeeTo(address) external", "function feeToSetter() view returns (address)", "function feeTo() view returns (address)"];
  const factory = new hre.ethers.Contract(FACTORY, factoryAbi, deployer);

  const currentFeeTo = await factory.feeTo();
  console.log("Current Factory.feeTo:", currentFeeTo);

  const feeToSetter = await factory.feeToSetter();
  console.log("Factory.feeToSetter:", feeToSetter);

  if (feeToSetter.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("Setting Factory.setFeeTo ->", FEE_SPLITTER);
    const tx = await factory.setFeeTo(FEE_SPLITTER);
    await tx.wait();
    console.log("Done!");
    const newFeeTo = await factory.feeTo();
    console.log("Factory.feeTo is now:", newFeeTo);
  } else {
    console.log("WARNING: feeToSetter is", feeToSetter, "— cannot set from deployer");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
