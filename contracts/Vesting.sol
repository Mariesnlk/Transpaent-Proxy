// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IERC20Mintable.sol";

contract Vesting is IVesting, Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant UNLOCKEDPERIOD = 360;
    uint256 private constant CLIFF = 600;
    uint256 private constant VESTINGTIME = 36000;

    IERC20 public immutable token;
    bool public isInitialTimestamp;
    mapping(address => Investor) public investorsBalances;
    mapping(AllocationTypes => uint256) public allocations;

    uint256 private vestingStarted; // start unlock tokens
    uint256 private vestingFinished; // finish unlock tokens
    uint256 private endCliffPeriod;

    constructor(address token_) {
        require(token_ != address(0), "Vesting: Invalid token address");
        token = IERC20(token_);

        allocations[AllocationTypes.Private] = 15;
        allocations[AllocationTypes.Seed] = 10;
    }

    /**
     * @dev Set initial timestamp, can be called only by the owner, can be called only once
     *
     * @param  _initialTimestamp - in seconds
     */
    function setInitialTimestamp(uint256 _initialTimestamp)
        external
        override
        onlyOwner
    {
        require(
            getCurrentTime() <= _initialTimestamp,
            "Vesting: initial timestamp cannot be less than current time"
        );
        require(!isInitialTimestamp, "Vesting: Is alredy called");
        isInitialTimestamp = true;

        vestingStarted = _initialTimestamp;
        vestingFinished = vestingStarted + VESTINGTIME;
        endCliffPeriod = vestingStarted + CLIFF;
    }

    /**
     * @dev Mint tokens for vesting contract equal to the sum of param tokens amount,
     * can be called only by the owner
     *
     * @param  _investors - array of investors
     * @param  _amounts - array of amounts(how much every investor can withdrow)
     * @param  _allocationType - enum param
     */
    function addInvestors(
        address[] memory _investors,
        uint256[] memory _amounts,
        AllocationTypes _allocationType
    ) external override onlyOwner {
        require(
            _investors.length == _amounts.length,
            "Vesting: Array lengths different"
        );

        uint256 sumToMint;

        for (uint256 i = 0; i < _investors.length; i++) {
            require(
                investorsBalances[_investors[i]].amount == 0,
                "Vesting: this beneficiary is already added to the vesting list"
            );
            require(
                _investors[i] != address(0),
                "Vesting: the beneficiary address cannot be zero"
            );
            require(
                _amounts[i] != 0,
                "Vesting: the beneficiary amount cannot be zero"
            );
            investorsBalances[_investors[i]].amount = _amounts[i];

            investorsBalances[_investors[i]].allocationPercantage = allocations[
                _allocationType
            ];

            sumToMint += _amounts[i];
        }

        IERC20Mintable(address(token)).mint(address(this), sumToMint);

        emit AddedInvestors(_investors, _amounts, _allocationType);
    }

    /**
     * @dev Should transfer tokens to investors, can be called only after the initial timestamp is set
     *
     * @return -how much tokens beneficiary is already withdraw
     */
    function withdrawTokens() external override returns (uint256) {
        require(
            isInitialTimestamp,
            "Vesting: Initial timestamp is not already set"
        );
        require(
            investorsBalances[msg.sender].amount != 0,
            "Vesting: this beneficiary is not added to the vesting list"
        );
        require(
            investorsBalances[msg.sender].amount != investorsBalances[msg.sender].claimedAmount,
            "Vesting: all tokens is already withdraw"
        );

        uint256 allocationAmount = investorsBalances[msg.sender].amount;
        uint256 availableWithdrawAmount;
        if (getCurrentTime() <= endCliffPeriod) {
            availableWithdrawAmount = 0;
        } else if (getCurrentTime() > vestingFinished) {
            availableWithdrawAmount = allocationAmount;
        } else {
            uint256 percentage = ((getCurrentTime() - vestingStarted) / UNLOCKEDPERIOD) +
                        investorsBalances[msg.sender].allocationPercantage;
            if(percentage >=100) percentage = 100;
            availableWithdrawAmount = allocationAmount * percentage /100;
        }

        token.safeTransfer(msg.sender, availableWithdrawAmount);
        investorsBalances[msg.sender].claimedAmount += availableWithdrawAmount;

        emit WithdrawTokens(address(this), msg.sender, availableWithdrawAmount);

        return availableWithdrawAmount;
    }

    function getCurrentTime() internal view virtual returns (uint256) {
        return block.timestamp;
    }
}