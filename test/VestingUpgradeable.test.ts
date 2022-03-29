import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from 'ethers'
import { a } from './utils/utils'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)

describe("VestingUpgradeable", () => {

    let proxy:Contract
    let tokenContract: Contract

    let owner: SignerWithAddress
    let beneficiary1: SignerWithAddress
    let beneficiary2: SignerWithAddress
    let beneficiary3: SignerWithAddress
    let beneficiary4: SignerWithAddress
    let beneficiary5: SignerWithAddress
    let otherAccounts: SignerWithAddress[]

    let name: string = "Vesting Token"
    let symbol: string = "VSTNGTKN"
    let totalSupply: number = 10000

    beforeEach(async () => {
        [owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5, ...otherAccounts] = await ethers.getSigners();

        const Token = await ethers.getContractFactory('Token')
        tokenContract = await Token.deploy(name, symbol, totalSupply);
        const VestingUpgradeable = await ethers.getContractFactory('VestingUpgradeable')
        proxy = await upgrades.deployProxy(VestingUpgradeable, [tokenContract.address]);
        await tokenContract.addMinter(proxy.address);

        await expect(upgrades.deployProxy(VestingUpgradeable, ['0x0000000000000000000000000000000000000000']))
            .to.be.revertedWith("VestingUpgradeable: Invalid token address");
    })

    describe('Deploy contracts', async () => {
        it('Should contracts not to be ..', async () => {
            expect(tokenContract.address).to.be.not.undefined;
            expect(tokenContract.address).to.be.not.null;
            expect(tokenContract.address).to.be.not.NaN;
            expect(proxy.address).to.be.not.undefined;
            expect(proxy.address).to.be.not.null;
            expect(proxy.address).to.be.not.NaN;
        })

        it('Should initialize name and symbol correct', async () => {
            expect(await tokenContract.name()).to.be.equal(name)
            expect(await tokenContract.symbol()).to.be.equal(symbol)
        })

        it('Should initialize totalSupply and balance of the owner correct', async () => {
            expect(await tokenContract.totalSupply()).to.be.equal(totalSupply)
            expect(await tokenContract.balanceOf(a(owner))).to.be.equal(totalSupply)
        })

        it('Should initialize vestingToken contract correct', async () => {
            expect(await tokenContract.balanceOf(proxy.address)).to.be.equal(0)
            expect(await proxy.owner()).to.be.equal(await a(owner))
        })
    })

    describe('Set initial timestamp', async () => {

        it('Should set initial timestamp', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;
        })

        it('Should revert second time to set initialTimestamp', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await expect(proxy.setInitialTimestamp(initialTime))
                .to.be.revertedWith("VestingUpgradeable: Is alredy called");
        })

        it('Should revert second time to set initialTimestamp', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;
            await expect(proxy.setInitialTimestamp(initialTime))
                .to.be.revertedWith("VestingUpgradeable: Is alredy called");
        })

        it('Should reverted only owner can call function', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await expect(proxy.connect(beneficiary1).setInitialTimestamp(initialTime))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it('Should revert if initialTimestamp is less then currentTime', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore;

            await expect(proxy.setInitialTimestamp(initialTime))
                .to.be.revertedWith("VestingUpgradeable: initial timestamp cannot be less than current time");
        })
    })

    describe('Intercat(add) with investors', async () => {

        it('Should reverted only owner can call addInvestors', async () => {
            await expect(proxy.connect(beneficiary5).addInvestors([a(beneficiary1), a(beneficiary2), a(beneficiary3)], [50, 50], 0))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it('Should revert if arrays will be diff length', async () => {
            await expect(proxy.addInvestors([a(beneficiary1), a(beneficiary2), a(beneficiary3)], [50, 50], 0))
                .to.be.revertedWith("VestingUpgradeable: Array lengths different");
        })

        it('Should add investors', async () => {
            expect(await tokenContract.balanceOf(proxy.address)).to.be.equal(0);
            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            expect(await tokenContract.balanceOf(proxy.address)).to.be.equal(100);
        })

        it('Should revert if beneficiary is already added', async () => {
            await tokenContract.increaseAllowance(proxy.address, 150);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            await expect(proxy.addInvestors([a(beneficiary1)], [50], 1))
                .to.be.revertedWith("VestingUpgradeable: this beneficiary is already added to the vesting list");
        })

        it('Should revert if beneficiary address is zero', async () => {
            await tokenContract.increaseAllowance(proxy.address, 50);
            await expect(proxy.addInvestors(['0x0000000000000000000000000000000000000000'], [50], 1))
                .to.be.revertedWith("VestingUpgradeable: the beneficiary address cannot be zero");
        })

        it('Should revert if beneficiary amiunt is zero', async () => {
            await tokenContract.increaseAllowance(proxy.address, 50);
            await expect(proxy.addInvestors([a(beneficiary1)], [0], 1))
                .to.be.revertedWith("VestingUpgradeable: the beneficiary amount cannot be zero");
        })

    })

    describe('Withdraw tokens', async () => {
        it('Should revert if initial timestamp is not already set', async () => {
            expect(await proxy.isInitialTimestamp()).to.be.false;
            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            await expect(proxy.connect(beneficiary1).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable: Initial timestamp is not already set");
            expect(await proxy.isInitialTimestamp()).to.be.false;
        })

        it('Should return nothing if cliff period is not finished', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 1);

            const increaseTime = 60 * 5;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await proxy.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(0);
        })

        it('Should success if ends unlock token period', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 1);

            const increaseTime = 60 * 60 * 24;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await proxy.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(50);

        })

        it('Should revert if all tokens is already withdraw', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [15, 15], 0);

            const increaseTime = 60 * 60 * 10;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary2), 15);
            await proxy.connect(beneficiary2).withdrawTokens();

            expect(await tokenContract.balanceOf(a(beneficiary2))).to.be.equal(15);
            const [amount, claimedAmount, allocationPercantage, isWithdraw, allocationType] = await proxy.investorsBalances(a(beneficiary2));
            expect(amount).to.be.equal(15);
            expect(claimedAmount).to.be.equal(15);
            await expect(proxy.connect(beneficiary2).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable: all tokens is already withdraw");
            expect(await tokenContract.balanceOf(a(beneficiary2))).to.be.equal(15);

        })

        it('Should withdraw tokens to beneficiary', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);


            const increaseTime = 60 * 60;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary1), 50);
            await proxy.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(9);
            const [amount, claimedAmount, allocationPercantage, isWithdraw, allocationType] = await proxy.investorsBalances(a(beneficiary1));
            expect(amount).to.be.equal(50);
            expect(claimedAmount).to.be.equal(9);
        })

        it('Should revert if beneficiary is not added', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy.setInitialTimestamp(initialTime);
            expect(await proxy.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy.address, 100);
            await proxy.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);

            const increaseTime = 60 * 60;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary3), 50);
            await expect(proxy.connect(beneficiary3).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable: this beneficiary is not added to the vesting list");
        })
    })

});
