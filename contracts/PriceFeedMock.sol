// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PriceFeedMock {
    int256 private price;

    function setLatestPrice(int256 _price) external {
        price = _price;
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (0, price, 0, 0, 0);
    }
}

