import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract } from 'ethers'
import { a } from './utils/utils'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)

describe("VestingUpgradeable_V2", () => {

    let proxy: Contract
    let proxy_v2: Contract
    let tokenContract: Contract

    let owner: SignerWithAddress
    let beneficiary1: SignerWithAddress
    let beneficiary2: SignerWithAddress
    let beneficiary3: SignerWithAddress
    let beneficiary4: SignerWithAddress
    let beneficiary5: SignerWithAddress
    let otherAccounts: SignerWithAddress[]
    let addressFrom: SignerWithAddress
    let addressTo: SignerWithAddress

    let name: string = "Vesting Token"
    let symbol: string = "VSTNGTKN"
    let totalSupply: number = 10000

    beforeEach(async () => {
        [owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4, beneficiary5, ...otherAccounts] = await ethers.getSigners();

        const Token = await ethers.getContractFactory('Token')
        tokenContract = await Token.deploy(name, symbol, totalSupply);
        const VestingUpgradeable = await ethers.getContractFactory('VestingUpgradeable')
        proxy = await upgrades.deployProxy(VestingUpgradeable, [tokenContract.address]);

        const VestingUpgradeable_V2 = await ethers.getContractFactory('VestingUpgradeable_V2')
        proxy_v2 = await upgrades.upgradeProxy(proxy.address, VestingUpgradeable_V2);

        await expect(upgrades.deployProxy(VestingUpgradeable_V2, ['0x0000000000000000000000000000000000000000']))
            .to.be.revertedWith("VestingUpgradeable_V2: Invalid token address");

        await tokenContract.addMinter(proxy_v2.address);

        addressFrom = otherAccounts[12];
        addressTo = otherAccounts[13];

    })

    describe('Deploy contracts', async () => {
        it('Should contracts not to be ..', async () => {
            expect(tokenContract.address).to.be.not.undefined;
            expect(tokenContract.address).to.be.not.null;
            expect(tokenContract.address).to.be.not.NaN;
            expect(proxy_v2.address).to.be.not.undefined;
            expect(proxy_v2.address).to.be.not.null;
            expect(proxy_v2.address).to.be.not.NaN;
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
            expect(await tokenContract.balanceOf(proxy_v2.address)).to.be.equal(0)
            expect(await proxy_v2.owner()).to.be.equal(await a(owner))
        })
    })

    describe('Set initial timestamp', async () => {

        it('Should set initial timestamp', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;
        })

        it('Should revert second time to set initialTimestamp', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await expect(proxy_v2.setInitialTimestamp(initialTime))
                .to.be.revertedWith("VestingUpgradeable_V2: Is alredy called");
        })

        it('Should reverted only owner can call function', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 500;

            await expect(proxy_v2.connect(beneficiary1).setInitialTimestamp(initialTime))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it('Should revert if initialTimestamp is less then currentTime', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore;

            await expect(proxy_v2.setInitialTimestamp(initialTime))
                .to.be.revertedWith("VestingUpgradeable_V2: initial timestamp cannot be less than current time");
        })
    })

    describe('Intercat(add) with investors', async () => {

        it('Should reverted only owner can call addInvestors', async () => {
            await expect(proxy.connect(beneficiary5).addInvestors([a(beneficiary1), a(beneficiary2), a(beneficiary3)], [50, 50], 0))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it('Should revert if arrays will be diff length', async () => {
            await expect(proxy.addInvestors([a(beneficiary1), a(beneficiary2), a(beneficiary3)], [50, 50], 0))
                .to.be.revertedWith("VestingUpgradeable_V2: Array lengths different");
        })

        it('Should add investors', async () => {
            expect(await tokenContract.balanceOf(proxy_v2.address)).to.be.equal(0);
            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            expect(await tokenContract.balanceOf(proxy_v2.address)).to.be.equal(100);
        })

        it('Should revert if beneficiary is already added', async () => {
            await tokenContract.increaseAllowance(proxy_v2.address, 150);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            await expect(proxy_v2.addInvestors([a(beneficiary1)], [50], 1))
                .to.be.revertedWith("VestingUpgradeable_V2: this beneficiary is already added to the vesting list");
        })

        it('Should revert if beneficiary address is zero', async () => {
            await tokenContract.increaseAllowance(proxy_v2.address, 50);
            await expect(proxy_v2.addInvestors(['0x0000000000000000000000000000000000000000'], [50], 1))
                .to.be.revertedWith("VestingUpgradeable_V2: the beneficiary address cannot be zero");
        })

        it('Should revert if beneficiary amiunt is zero', async () => {
            await tokenContract.increaseAllowance(proxy_v2.address, 50);
            await expect(proxy_v2.addInvestors([a(beneficiary1)], [0], 1))
                .to.be.revertedWith("VestingUpgradeable_V2: the beneficiary amount cannot be zero");
        })

    })

    describe('Withdraw tokens', async () => {
        it('Should revert if initial timestamp is not already set', async () => {
            expect(await proxy_v2.isInitialTimestamp()).to.be.false;
            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);
            await expect(proxy_v2.connect(beneficiary1).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable_V2: Initial timestamp is not already set");
            expect(await proxy_v2.isInitialTimestamp()).to.be.false;
        })

        it('Should return nothing if cliff period is not finished', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 1);

            const increaseTime = 60 * 5;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await proxy_v2.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(0);
        })

        it('Should success if ends unlock token period', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 1);

            const increaseTime = 60 * 60 * 24;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await proxy_v2.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(50);

        })

        it('Should revert if all tokens is already withdraw', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [15, 15], 0);

            const increaseTime = 60 * 60 * 10;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary2), 15);
            await proxy_v2.connect(beneficiary2).withdrawTokens();

            expect(await tokenContract.balanceOf(a(beneficiary2))).to.be.equal(15);
            const [amount, claimedAmount, allocationPercantage, isWithdraw, allocationType] = await proxy.investorsBalances(a(beneficiary2));
            expect(amount).to.be.equal(15);
            expect(claimedAmount).to.be.equal(15);
            await expect(proxy_v2.connect(beneficiary2).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable_V2: all tokens is already withdraw");
            expect(await tokenContract.balanceOf(a(beneficiary2))).to.be.equal(15);

        })

        it('Should withdraw tokens to beneficiary', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);


            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary1), 50);
            await proxy_v2.connect(beneficiary1).withdrawTokens();
            expect(await tokenContract.balanceOf(a(beneficiary1))).to.be.equal(23);
            const [amount, claimedAmount, allocationPercantage, isWithdraw, allocationType] = await proxy.investorsBalances(a(beneficiary1));
            expect(amount).to.be.equal(50);
            expect(claimedAmount).to.be.equal(23);
        })

        it('Should revert if beneficiary is not added', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(beneficiary1), a(beneficiary2)], [50, 50], 0);

            const increaseTime = 60 * 60;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(beneficiary3), 50);
            await expect(proxy_v2.connect(beneficiary3).withdrawTokens())
                .to.be.revertedWith("VestingUpgradeable_V2: this beneficiary is not added to the vesting list");
        })
    })


    describe('Change Investor', async () => {

        it('Should successfully change investor to the new investor', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(addressFrom)], [100], 0);

            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            const [amount1, claimedAmount1, allocationPercantage1, isWithdraw1, allocationType1] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount1).to.be.equal(100);
            expect(claimedAmount1).to.be.equal(0);

            await proxy_v2.changeInvestor();

            const [amount2, claimedAmount2, allocationPercantage2, isWithdraw2, allocationType2] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount2).to.be.equal(0);
            expect(claimedAmount2).to.be.equal(0);

            const [amount3, claimedAmount3, allocationPercantage3, isWithdraw3, allocationType3] =
                await proxy.investorsBalances(a(addressTo));
            expect(amount3).to.be.equal(100);
            expect(claimedAmount3).to.be.equal(0);

        })

        it('Should successfully change investor to the new investor when old one is withdraw some tokens', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(addressFrom)], [100], 0);

            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(addressFrom), 100);
            await proxy_v2.connect(addressFrom).withdrawTokens();

            const [amount1, claimedAmount1, allocationPercantage1, isWithdraw1, allocationType1] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount1).to.be.equal(100);
            expect(claimedAmount1).to.be.equal(46);

            await proxy_v2.changeInvestor();

            const [amount2, claimedAmount2, allocationPercantage2, isWithdraw2, allocationType2] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount2).to.be.equal(0);
            expect(claimedAmount2).to.be.equal(0);

            const [amount3, claimedAmount3, allocationPercantage3, isWithdraw3, allocationType3] =
                await proxy.investorsBalances(a(addressTo));
            expect(amount3).to.be.equal(100);
            expect(claimedAmount3).to.be.equal(46);

        })

        it('Reverted changing investor because it`s already changes', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(addressFrom)], [100], 0);

            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await proxy_v2.changeInvestor();

            const [amount2, claimedAmount2, allocationPercantage2, isWithdraw2, allocationType2] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount2).to.be.equal(0);
            expect(claimedAmount2).to.be.equal(0);

            const [amount3, claimedAmount3, allocationPercantage3, isWithdraw3, allocationType3] =
                await proxy.investorsBalances(a(addressTo));
            expect(amount3).to.be.equal(100);
            expect(claimedAmount3).to.be.equal(0);

            await expect(proxy_v2.changeInvestor())
                .to.be.revertedWith("VestingUpgradeable_V2: is already called");

        })

        it('Reverted changing investor beacuse the new investor is already investor', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(addressTo)], [100], 0);

            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await expect(proxy_v2.changeInvestor())
                .to.be.revertedWith("VestingUpgradeable_V2: cannot be investor because 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 is already the investor");

        })

        it('Reverted changing investor beacuse investor is not in added to the investors list', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            const increaseTime = 60 * 20;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await expect(proxy_v2.changeInvestor())
                .to.be.revertedWith("VestingUpgradeable_V2: address 0xdD2FD4581271e230360230F9337D5c0430Bf44C0 is not added to the investors list");

        })

        it('Reverted changing investor beacuse investor already withdraw all tokens', async () => {
            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;
            const initialTime = timestampBefore + 100;

            await proxy_v2.setInitialTimestamp(initialTime);
            expect(await proxy_v2.isInitialTimestamp()).to.be.true;

            await tokenContract.increaseAllowance(proxy_v2.address, 100);
            await proxy_v2.addInvestors([a(addressFrom)], [100], 0);

            const increaseTime = 60 * 60;
            await ethers.provider.send("evm_increaseTime", [increaseTime]);
            await ethers.provider.send("evm_mine", [])

            await tokenContract.increaseAllowance(a(addressFrom), 100);
            await proxy_v2.connect(addressFrom).withdrawTokens();

            const [amount1, claimedAmount1, allocationPercantage1, isWithdraw1, allocationType1] =
                await proxy.investorsBalances(a(addressFrom));
            expect(amount1).to.be.equal(100);
            expect(claimedAmount1).to.be.equal(100);

            await expect(proxy_v2.changeInvestor())
                .to.be.revertedWith("VestingUpgradeable_V2: cannot change investor because all tokens is already withdraw");
        })

    })

});
