
import { ethers, upgrades } from "hardhat";

async function main() {
    const tokenAddress = "0x819152B00114ECB775509819b0F2467074AD9628";

    // deploy implementation_v1
    const UpgradeableVesting = await ethers.getContractFactory("VestingUpgradeable");
    const vesting_v1 = await upgrades.deployProxy(UpgradeableVesting, [tokenAddress], { kind: 'transparent' });
    await vesting_v1.deployed()
    console.log("Upgradeable Vesting deployed to:", vesting_v1.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});