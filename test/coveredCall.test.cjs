const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoveredCall", function () {
    let CoveredCall, coveredCall, owner, buyer, priceFeedMock, strikePrice, expiration;

    beforeEach(async function () {
        [owner, buyer] = await ethers.getSigners();

        // Mock Chainlink price feed
        const PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
        priceFeedMock = await PriceFeedMock.deploy();
        await priceFeedMock.deployed();

        strikePrice = ethers.utils.parseUnits("2000", 18); // $2000 strike price
        expiration = (await ethers.provider.getBlock("latest")).timestamp + 86400; // 1 day from now

        CoveredCall = await ethers.getContractFactory("CoveredCall");
        coveredCall = await CoveredCall.deploy(priceFeedMock.address, strikePrice, expiration, { value: ethers.utils.parseUnits("1", 18) });
        await coveredCall.deployed();
    });

    it("Should initialize contract correctly", async function () {
        expect(await coveredCall.seller()).to.equal(owner.address);
        expect(await coveredCall.strikePrice()).to.equal(strikePrice);
        expect(await coveredCall.expiration()).to.equal(expiration);
    });

    it("Should allow a buyer to purchase the option", async function () {
        await coveredCall.connect(buyer).buyOption({ value: ethers.utils.parseUnits("0.1", 18) });
        expect(await coveredCall.buyer()).to.equal(buyer.address);
    });

    it("Should allow buyer to exercise option if ITM", async function () {
        await coveredCall.connect(buyer).buyOption({ value: ethers.utils.parseUnits("0.1", 18) });

        // Simulate ITM price ($2100)
        await priceFeedMock.setLatestPrice(ethers.utils.parseUnits("2100", 18));

        await coveredCall.connect(buyer).exerciseOption({ value: ethers.utils.parseUnits("2", 18) });

        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
    });

    it("Should allow seller to reclaim escrowed ETH if OTM on expiration", async function () {
        await network.provider.send("evm_increaseTime", [86400]); // Fast forward 1 day
        await network.provider.send("evm_mine");

        await coveredCall.connect(owner).expireWorthless();
        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
    });
});

