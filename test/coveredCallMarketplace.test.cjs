const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoveredCall Marketplace", function () {
    let Marketplace, marketplace, CoveredCall, coveredCall;
    let owner, seller, buyer;
    let priceFeedMock, usdcMock;
    let strikePrice, expiration, premium;

    beforeEach(async function () {
        [owner, seller, buyer] = await ethers.getSigners();

        // Deploy Mock Contracts
        const PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
        priceFeedMock = await PriceFeedMock.deploy();
        await priceFeedMock.waitForDeployment();

        const USDCMock = await ethers.getContractFactory("USDCMock");
        usdcMock = await USDCMock.deploy();
        await usdcMock.waitForDeployment();

        await usdcMock.mint(buyer.address, ethers.parseUnits("1000", 6));

        // Deploy Marketplace
        const MarketplaceContract = await ethers.getContractFactory("CoveredCallMarketplace");
        marketplace = await MarketplaceContract.deploy(await usdcMock.getAddress());
        await marketplace.waitForDeployment();

        // Option parameters
        strikePrice = ethers.parseUnits("55", 18);
        expiration = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 180;
        premium = ethers.parseUnits("4", 6);
    });

    it("Should allow sellers to list covered calls", async function () {
        await marketplace.connect(seller).listCoveredCall(
            await priceFeedMock.getAddress(),
            strikePrice,
            expiration,
            premium,
            { value: ethers.parseUnits("1", 18) } // Escrow ETH
        );

        const listings = await marketplace.getListings();
        expect(listings.length).to.equal(1);
        expect(listings[0].seller).to.equal(seller.address);
    });

    it("Should allow buyers to purchase an available option", async function () {
        await marketplace.connect(seller).listCoveredCall(
            await priceFeedMock.getAddress(),
            strikePrice,
            expiration,
            premium,
            { value: ethers.parseUnits("1", 18) } // Escrow ETH
        );
    
        let listings = await marketplace.getListings();
        const optionAddress = listings[0].contractAddress;
    
        // ✅ Approve the Marketplace **AND** the CoveredCall contract
        await usdcMock.connect(buyer).approve(await marketplace.getAddress(), premium);
        await usdcMock.connect(buyer).approve(optionAddress, premium);
    
        // Debug Allowance
        const marketplaceAllowance = await usdcMock.allowance(buyer.address, await marketplace.getAddress());
        const optionAllowance = await usdcMock.allowance(buyer.address, optionAddress);
        
        console.log(`Marketplace Allowance: ${marketplaceAllowance.toString()}`);
        console.log(`CoveredCall Allowance: ${optionAllowance.toString()}`);
    
        // Ensure both contracts have the correct allowance
        expect(marketplaceAllowance).to.equal(premium);
        expect(optionAllowance).to.equal(premium);
    
        // Buyer purchases the option
        await marketplace.connect(buyer).buyCoveredCall(optionAddress);
    
        listings = await marketplace.getListings();
        expect(listings[0].sold).to.be.true;
    });
    
    
    

    it("Should allow exercising an in-the-money option", async function () {
        await marketplace.connect(seller).listCoveredCall(
            await priceFeedMock.getAddress(),
            strikePrice,
            expiration,
            premium,
            { value: ethers.parseUnits("1", 18) } // Escrow ETH
        );

        let listings = await marketplace.getListings();
        const optionAddress = listings[0].contractAddress;
        const coveredCall = await ethers.getContractAt("CoveredCall", optionAddress);

        // Approve and buy option
        await usdcMock.connect(buyer).approve(await marketplace.getAddress(), premium);
        await marketplace.connect(buyer).buyCoveredCall(optionAddress);

        // Price rises above strike price
        await priceFeedMock.setLatestPrice(ethers.parseUnits("60", 18));

        // Buyer exercises
        await coveredCall.connect(buyer).exerciseOption({
            value: ethers.parseUnits("55", 18),
        });

        expect(await ethers.provider.getBalance(optionAddress)).to.equal(0n);
    });

    it("Should allow seller to reclaim ETH after expiration if OTM", async function () {
        await marketplace.connect(seller).listCoveredCall(
            await priceFeedMock.getAddress(),
            strikePrice,
            expiration,
            premium,
            { value: ethers.parseUnits("1", 18) } // Escrow ETH
        );

        let listings = await marketplace.getListings();
        const optionAddress = listings[0].contractAddress;
        const coveredCall = await ethers.getContractAt("CoveredCall", optionAddress);

        // Approve and buy option
        await usdcMock.connect(buyer).approve(await marketplace.getAddress(), premium);
        await marketplace.connect(buyer).buyCoveredCall(optionAddress);

        // Price stays OTM
        await priceFeedMock.setLatestPrice(ethers.parseUnits("40", 18));

        // Move past expiration
        await ethers.provider.send("evm_increaseTime", [86400 * 181]);
        await ethers.provider.send("evm_mine", []);

        // Seller reclaims ETH
        await coveredCall.connect(seller).expireWorthless();

        expect(await ethers.provider.getBalance(optionAddress)).to.equal(0n);
    });
});
