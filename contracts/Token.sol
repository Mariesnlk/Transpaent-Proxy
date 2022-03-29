// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./minting/ERC20Mintable.sol";

contract Token is ERC20Mintable {
    constructor(string memory name, string memory symbol, uint256 supply) ERC20Mintable(name, symbol) {
          _mint(msg.sender, supply);
    }
}
