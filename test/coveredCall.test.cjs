const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoveredCall", function () {
    let CoveredCall, coveredCall, owner, buyer, usdcMock, priceFeedMock;
    let strikePrice, expiration, premium;

beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    // Mock Chainlink price feed
    const PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
    priceFeedMock = await PriceFeedMock.deploy();
    await priceFeedMock.waitForDeployment(); // Ensure it fully deploys
    const priceFeedAddress = await priceFeedMock.getAddress(); // Get correct address

    // Mock USDC token
    const USDCMock = await ethers.getContractFactory("USDCMock");
    usdcMock = await USDCMock.deploy();
    await usdcMock.waitForDeployment(); // Ensure it fully deploys
    const usdcAddress = await usdcMock.getAddress(); // Get correct address

    // Mint USDC for buyer
    await usdcMock.mint(buyer.address, ethers.parseUnits("1000", 6));

    strikePrice = ethers.parseUnits("55", 18);
    expiration = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 180;
    premium = ethers.parseUnits("4", 6);

    CoveredCall = await ethers.getContractFactory("CoveredCall");
    coveredCall = await CoveredCall.deploy(
        priceFeedAddress,  // ✅ Use valid address
        usdcAddress,       // ✅ Use valid address
        strikePrice,
        expiration,
        premium,
        { value: ethers.parseUnits("1", 18) }
    );
    await coveredCall.waitForDeployment();
});

    

    it("Should initialize contract correctly", async function () {
        expect(await coveredCall.seller()).to.equal(owner.address);
        expect(await coveredCall.strikePrice()).to.equal(strikePrice);
        expect(await coveredCall.expiration()).to.equal(expiration);
    });

    it("Bullish Case: Option is exercised when ITM", async function () {
        await usdcMock.connect(buyer).approve(await coveredCall.getAddress(), premium);
        await coveredCall.connect(buyer).buyOption();
      
        // Simulate price rising to $60 (ITM)
        await priceFeedMock.setLatestPrice(ethers.parseUnits("60", 18));
      
        // Increase time using ethers.provider
        await ethers.provider.send("evm_increaseTime", [86400 * 181]); 
        await ethers.provider.send("evm_mine", []);
      
        await coveredCall.connect(buyer).exerciseOption({
          value: ethers.parseUnits("55", 18),
        });
      
        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
      });
      
    

    it("Bullish Case: Option is exercised when ITM", async function () {
        await usdcMock.connect(buyer).approve(coveredCall.address, premium);
        await coveredCall.connect(buyer).buyOption();

        // Simulate price rising to $60 (ITM)
        await priceFeedMock.setLatestPrice(ethers.utils.parseUnits("60", 18));

        await coveredCall.connect(buyer).exerciseOption({ value: ethers.utils.parseUnits("55", 18) });

        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
    });

    it("Bearish Case: Option expires worthless when OTM", async function () {
        await usdcMock.connect(buyer).approve(coveredCall.address, premium);
        await coveredCall.connect(buyer).buyOption();

        // Simulate price dropping to $40 (OTM)
        await priceFeedMock.setLatestPrice(ethers.utils.parseUnits("40", 18));

        await network.provider.send("evm_increaseTime", [86400 * 181]); // Fast forward 6 months
        await network.provider.send("evm_mine");

        await coveredCall.connect(owner).expireWorthless();
        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
    });

    it("Should allow auto exercise function to trigger execution", async function () {
        await usdcMock.connect(buyer).approve(coveredCall.address, premium);
        await coveredCall.connect(buyer).buyOption();

        // Simulate price rising to $60
        await priceFeedMock.setLatestPrice(ethers.utils.parseUnits("60", 18));

        await network.provider.send("evm_increaseTime", [86400 * 181]); // Fast forward 6 months
        await network.provider.send("evm_mine");

        await coveredCall.autoExercise();
        expect(await ethers.provider.getBalance(coveredCall.address)).to.equal(0);
    });
});
