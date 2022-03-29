// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IVesting {
    event AddedInvestors(
        address[] indexed _investor,
        uint256[] _amount,
        AllocationTypes _allocationType
    );

    event WithdrawTokens(
        address indexed _from,
        address indexed _to,
        uint256 _amount
    );

    event ChangeInvestor(
        address indexed from,
        address indexed to,
        uint256 allocationAmount,
        uint256 claimedAmount,
        uint256 allocationType
    );

    enum AllocationTypes {
        Seed,
        Private
    }

    struct Investor {
        uint256 amount;
        uint256 claimedAmount;
        uint256 allocationPercantage;
    }

    /**
     * @dev Set initial timestamp, can be called only by the owner, can be called only once
     *
     * @param  _initialTimestamp -
     */
    function setInitialTimestamp(uint256 _initialTimestamp) external;

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
    ) external;

    /**
     * @dev Should transfer tokens to investors, can be called only after the initial timestamp is set
     *
     * @return -how much tokens beneficiary is already withdraw
     */
    function withdrawTokens() external returns (uint256);
}
