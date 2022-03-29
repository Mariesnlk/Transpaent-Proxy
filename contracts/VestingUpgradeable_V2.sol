// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IVesting.sol";
import "./interfaces/IERC20Mintable.sol";

contract VestingUpgradeable_V2 is IVesting, OwnableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 private constant UNLOCKEDPERIOD = 60;
    uint256 private constant CLIFF = 600;
    uint256 private constant VESTINGTIME = 36000;

    IERC20Upgradeable public token;
    bool public isInitialTimestamp;
    mapping(address => Investor) public investorsBalances;
    mapping(AllocationTypes => uint256) public allocations;

    uint256 private vestingStarted; // start unlock tokens
    uint256 private vestingFinished; // finish unlock tokens
    uint256 private endCliffPeriod;
    bool private isCall;

    function initialize(address token_) external initializer {
        require(
            token_ != address(0),
            "VestingUpgradeable_V2: Invalid token address"
        );
        token = IERC20Upgradeable(token_);

        allocations[AllocationTypes.Private] = 15;
        allocations[AllocationTypes.Seed] = 10;

        __Ownable_init();
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
            "VestingUpgradeable_V2: initial timestamp cannot be less than current time"
        );
        require(!isInitialTimestamp, "VestingUpgradeable_V2: Is alredy called");
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
            "VestingUpgradeable_V2: Array lengths different"
        );

        uint256 sumToMint;

        for (uint256 i = 0; i < _investors.length; i++) {
            require(
                investorsBalances[_investors[i]].amount == 0,
                "VestingUpgradeable_V2: this beneficiary is already added to the vesting list"
            );
            require(
                _investors[i] != address(0),
                "VestingUpgradeable_V2: the beneficiary address cannot be zero"
            );
            require(
                _amounts[i] != 0,
                "VestingUpgradeable_V2: the beneficiary amount cannot be zero"
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

    // can be call only once
    function changeInvestor() external onlyOwner {
        require(!isCall, "VestingUpgradeable_V2: is already called");
        isCall = true;
        address addressFrom = 0xdD2FD4581271e230360230F9337D5c0430Bf44C0;
        address addressTo = 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199;
        require(investorsBalances[addressTo].amount == 0, 
            "VestingUpgradeable_V2: cannot be investor because 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 is already the investor");

        uint256 amountForChangedInvestor = investorsBalances[addressFrom]
            .amount;
        uint256 claimedAmountForChangedInvestor = investorsBalances[addressFrom]
            .claimedAmount;
        uint256 allocationPercantage = investorsBalances[addressFrom]
            .allocationPercantage;
        require(
            investorsBalances[addressFrom].amount != 0,
            "VestingUpgradeable_V2: address 0xdD2FD4581271e230360230F9337D5c0430Bf44C0 is not added to the investors list"
        );
        require(
            amountForChangedInvestor != claimedAmountForChangedInvestor,
            "VestingUpgradeable_V2: cannot change investor because all tokens is already withdraw"
        );

        investorsBalances[addressFrom].amount = 0;
        investorsBalances[addressFrom].claimedAmount = 0;
        investorsBalances[addressTo].amount = amountForChangedInvestor;
        investorsBalances[addressTo]
            .claimedAmount = claimedAmountForChangedInvestor;
        investorsBalances[addressTo]
            .allocationPercantage = allocationPercantage;

        emit ChangeInvestor(
            addressFrom,
            addressTo,
            amountForChangedInvestor,
            claimedAmountForChangedInvestor,
            allocationPercantage
        );
    }

    /**
     * @dev Should transfer tokens to investors, can be called only after the initial timestamp is set
     *
     * @return -how much tokens beneficiary is already withdraw
     */
    function withdrawTokens() external override returns (uint256) {
        require(
            isInitialTimestamp,
            "VestingUpgradeable_V2: Initial timestamp is not already set"
        );
        require(
            investorsBalances[_msgSender()].amount != 0,
            "VestingUpgradeable_V2: this beneficiary is not added to the vesting list"
        );
        require(
            investorsBalances[_msgSender()].amount !=
                investorsBalances[_msgSender()].claimedAmount,
            "VestingUpgradeable_V2: all tokens is already withdraw"
        );

        uint256 allocationAmount = investorsBalances[_msgSender()].amount;
        uint256 availableWithdrawAmount = uncollected(
            allocationAmount,
            _msgSender()
        );

        token.safeTransfer(_msgSender(), availableWithdrawAmount);
        investorsBalances[_msgSender()]
            .claimedAmount += availableWithdrawAmount;

        emit WithdrawTokens(
            address(this),
            _msgSender(),
            availableWithdrawAmount
        );

        return availableWithdrawAmount;
    }

    function getCurrentTime() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    function uncollected(uint256 _allocationAmount, address _caller)
        private
        view
        returns (uint256)
    {
        uint256 amount;
        if (getCurrentTime() <= endCliffPeriod) {
            amount = 0;
        } else if (getCurrentTime() > vestingFinished) {
            amount = _allocationAmount;
        } else {
            uint256 percentage = (2 * (getCurrentTime() - vestingStarted) /
                UNLOCKEDPERIOD) +
                investorsBalances[_caller].allocationPercantage;
            if (percentage >= 100) percentage = 100;
            amount = (_allocationAmount * percentage) / 100;
        }

        return amount;
    }
}
