import { ethers } from "hardhat";

async function main() {

  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy("Vesting Token", "VSTNGTKN", 100);
  await token.deployed();
  console.log("Token deployed to:", token.address);

  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy(token.address);
  await vesting.deployed();
  console.log("Vesting deployed to:", vesting.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});