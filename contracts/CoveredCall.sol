

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";



contract CoveredCall {
    address public seller;
    address public buyer;
    uint256 public strikePrice;
    uint256 public expiration;
    bool public exercised;
    AggregatorV3Interface internal priceFeed;

    event OptionSold(address indexed buyer);
    event OptionExercised(address indexed buyer);
    event OptionExpired();

    modifier onlySeller() {
        require(msg.sender == seller, "Not seller");
        _;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Not buyer");
        _;
    }

    modifier notExpired() {
        require(block.timestamp < expiration, "Option expired");
        _;
    }

    constructor(address _priceFeed, uint256 _strikePrice, uint256 _expiration) payable {
        require(msg.value > 0, "Must escrow ETH");
        seller = msg.sender;
        strikePrice = _strikePrice;
        expiration = _expiration;
        priceFeed = AggregatorV3Interface(_priceFeed);
    }

    function buyOption() external payable notExpired {
        require(buyer == address(0), "Option already sold");
        require(msg.value > 0, "Must pay premium");
        buyer = msg.sender;
        emit OptionSold(msg.sender);
    }

    function exerciseOption() external payable onlyBuyer notExpired {
        require(!exercised, "Already exercised");
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(uint256(price) >= strikePrice, "Not in the money");
        exercised = true;
        payable(seller).transfer(address(this).balance);
        emit OptionExercised(buyer);
    }

    function expireWorthless() external onlySeller {
        require(block.timestamp >= expiration, "Not expired");
        require(!exercised, "Already exercised");
        payable(seller).transfer(address(this).balance);
        emit OptionExpired();
    }
}
