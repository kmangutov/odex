


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CoveredCall {
    address public seller;
    address public buyer;
    uint256 public strikePrice;
    uint256 public expiration;
    bool public exercised;
    AggregatorV3Interface internal priceFeed;
    IERC20 public usdc;
    uint256 public premium; // Option premium in USDC

    event OptionSold(address indexed buyer, uint256 premium);
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

    constructor(address _priceFeed, address _usdc, uint256 _strikePrice, uint256 _expiration, uint256 _premium) payable {
        require(msg.value > 0, "Must escrow ETH");
        seller = msg.sender;
        strikePrice = _strikePrice;
        expiration = _expiration;
        priceFeed = AggregatorV3Interface(_priceFeed);
        usdc = IERC20(_usdc);
        premium = _premium;
    }

    function buyOption() external notExpired {
        require(buyer == address(0), "Option already sold");
        require(usdc.transferFrom(msg.sender, seller, premium), "USDC transfer failed");
        buyer = msg.sender;
        emit OptionSold(msg.sender, premium);
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

    function autoExercise() external {
        // Stub function: This should be called automatically on expiration or via off-chain logic
        if (block.timestamp >= expiration && !exercised) {
            (, int256 price, , , ) = priceFeed.latestRoundData();
            if (uint256(price) >= strikePrice) {
                exercised = true;
                payable(seller).transfer(address(this).balance);
                emit OptionExercised(buyer);
            } else {
                emit OptionExpired();
            }
        }
    }
}
