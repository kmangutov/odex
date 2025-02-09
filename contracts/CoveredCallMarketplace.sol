// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CoveredCall.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CoveredCallMarketplace {
    struct OptionListing {
        address contractAddress;
        address seller;
        uint256 strikePrice;
        uint256 expiration;
        uint256 premium;
        bool sold;
    }

    IERC20 public usdc;
    OptionListing[] public listings;
    mapping(address => uint256) public listingIndex; // Track index for quick lookup

    event OptionListed(address indexed seller, address contractAddress);
    event OptionPurchased(address indexed buyer, address contractAddress);

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

function listCoveredCall(
    address priceFeed,
    uint256 strikePrice,
    uint256 expiration,
    uint256 premium
) external payable { // ✅ Ensure ETH is forwarded
    require(msg.value > 0, "Must send ETH to escrow");

    CoveredCall newOption = (new CoveredCall){value: msg.value}(
        priceFeed,
        address(usdc),
        strikePrice,
        expiration,
        premium
    );

    // Store in marketplace
    listings.push(
        OptionListing({
            contractAddress: address(newOption),
            seller: msg.sender,
            strikePrice: strikePrice,
            expiration: expiration,
            premium: premium,
            sold: false
        })
    );

    listingIndex[address(newOption)] = listings.length - 1;
    emit OptionListed(msg.sender, address(newOption));
}


    function buyCoveredCall(address contractAddress) external {
        uint256 index = listingIndex[contractAddress];
        OptionListing storage listing = listings[index];

        require(!listing.sold, "Already sold");
        require(usdc.transferFrom(msg.sender, listing.seller, listing.premium), "USDC transfer failed");

        CoveredCall coveredCall = CoveredCall(contractAddress);
        coveredCall.buyOption();
        listing.sold = true;

        emit OptionPurchased(msg.sender, contractAddress);
    }

    function getListings() external view returns (OptionListing[] memory) {
        return listings;
    }
}
