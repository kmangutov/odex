// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCMock is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 8000000 * (10 ** decimals()));
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
