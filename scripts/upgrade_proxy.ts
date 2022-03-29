
import { ethers, upgrades } from "hardhat";

async function main() {
    const proxyContract = "0x00Ac1Fab78757413705Ac422B027b9ABbe9ff19f";

    // upgrade to implementation_v2
    const VestingUpgradeable_V2 = await ethers.getContractFactory("VestingUpgradeable_V2");
    const vestingUpgradeable_V2 = await upgrades.upgradeProxy(proxyContract, VestingUpgradeable_V2);
    console.log("VestingUpgradeable_V2 upgraded:", vestingUpgradeable_V2.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});