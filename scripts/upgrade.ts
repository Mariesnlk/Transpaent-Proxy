
import { ethers } from "hardhat";

async function main() {

  const [deployer] = await ethers.getSigners()
  console.log('Deploying contracts with the account:', deployer.address)

  const tokenAddress = "0x819152B00114ECB775509819b0F2467074AD9628";

  // deploy implementation_v1
  const UpgradeableVesting = await ethers.getContractFactory("VestingUpgradeable");
  const vesting_v1 = await UpgradeableVesting.deploy();
  await vesting_v1.deployed()
  console.log("Upgradeable Vesting deployed to:", vesting_v1.address);


  // Deploy transparent proxy
  const TransparentProxy = await ethers.getContractFactory(
    "TransparentProxy"
  );

  const transparentProxy = await TransparentProxy.deploy(
    vesting_v1.address,
    deployer.address,
    []
  );
  await transparentProxy.deployed();
  console.log("Transparent Proxy deployed to:", transparentProxy.address);

  // initialize implementation_v1
  const instance = vesting_v1.attach(transparentProxy.address);
  await instance.initialize(tokenAddress);
  console.log("Initialize implementtion");

  // // deploy implementation_v2
  // const VestingUpgradeable_V2 = await ethers.getContractFactory(
  //   "VestingUpgradeable_V2"
  // );
  // const vestingUpgradeable_V2 = await VestingUpgradeable_V2.deploy();
  // await vestingUpgradeable_V2.deployed();
  // console.log("VestingUpgradeable_V2 upgraded:", vestingUpgradeable_V2.address);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});