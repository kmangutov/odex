const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CoveredCall", function () {
    let CoveredCall, coveredCall, owner, buyer, usdcMock, priceFeedMock;
    let strikePrice, expiration, premium;

    
    beforeEach(async function () {
        [owner, buyer] = await ethers.getSigners();
    
        // Deploy Chainlink Price Feed Mock
        const PriceFeedMock = await ethers.getContractFactory("PriceFeedMock");
        priceFeedMock = await PriceFeedMock.deploy();
        await priceFeedMock.waitForDeployment();
        const priceFeedAddress = await priceFeedMock.getAddress(); // ✅ Get correct address
    
        // Deploy USDC Mock
        const USDCMock = await ethers.getContractFactory("USDCMock");
        usdcMock = await USDCMock.deploy();
        await usdcMock.waitForDeployment();
        const usdcAddress = await usdcMock.getAddress(); // ✅ Get correct address
    
        // Mint USDC for the buyer
        await usdcMock.mint(buyer.address, ethers.parseUnits("1000", 6));
    
        // Set contract parameters
        strikePrice = ethers.parseUnits("55", 18);
        expiration = (await ethers.provider.getBlock("latest")).timestamp + 86400 * 180; // 6 months from now
        premium = ethers.parseUnits("4", 6);
    
        // Deploy CoveredCall contract with correct addresses
        CoveredCall = await ethers.getContractFactory("CoveredCall");
        coveredCall = await CoveredCall.deploy(
            priceFeedAddress,  // ✅ Ensure it's a valid address
            usdcAddress,       // ✅ Ensure it's a valid address
            strikePrice,
            expiration,
            premium,
            { value: ethers.parseUnits("1", 18) } // Escrow 1 ETH
        );
        await coveredCall.waitForDeployment();
    });

    

    it("Should initialize contract correctly", async function () {
        expect(await coveredCall.seller()).to.equal(owner.address);
        expect(await coveredCall.strikePrice()).to.equal(strikePrice);
        expect(await coveredCall.expiration()).to.equal(expiration);
    });


    it("Bullish Case: Option is exercised when ITM", async function () {
        const ccAddr = await coveredCall.getAddress();
      
        await usdcMock.connect(buyer).approve(ccAddr, premium);
        await coveredCall.connect(buyer).buyOption();
      
        // Price goes above strike
        await priceFeedMock.setLatestPrice(ethers.parseUnits("60", 18));
      
        // Increase time *just under* expiration
        await ethers.provider.send("evm_increaseTime", [86400 * 100]);
        await ethers.provider.send("evm_mine", []);
      
        // Exercise
        await coveredCall.connect(buyer).exerciseOption({
          value: ethers.parseUnits("55", 18),
        });
      
        // Check final balance of contract is zero
        expect(await ethers.provider.getBalance(ccAddr)).to.equal(0n);
      });
      


 it("Bearish Case: Option expires worthless when OTM", async function () {
    const ccAddr = await coveredCall.getAddress();

    await usdcMock.connect(buyer).approve(ccAddr, premium);
    await coveredCall.connect(buyer).buyOption();

    // Simulate price dropping to $40 (OTM)
    await priceFeedMock.setLatestPrice(ethers.parseUnits("40", 18));

    // Increase time to AFTER expiration (180+ days)
    await ethers.provider.send("evm_increaseTime", [86400 * 181]); // ✅ Expired
    await ethers.provider.send("evm_mine", []);

    // Seller should now be able to reclaim funds
    await coveredCall.connect(owner).expireWorthless();

    // Ensure contract balance is zero
    expect(await ethers.provider.getBalance(ccAddr)).to.equal(0n);
});

it("Should allow auto exercise function to trigger execution", async function () {
    const ccAddr = await coveredCall.getAddress();

    await usdcMock.connect(buyer).approve(ccAddr, premium);
    await coveredCall.connect(buyer).buyOption();

    // Simulate price rising to $60 (ITM)
    await priceFeedMock.setLatestPrice(ethers.parseUnits("60", 18));

    // Increase time past expiration
    await ethers.provider.send("evm_increaseTime", [86400 * 181]); // ✅ Expired
    await ethers.provider.send("evm_mine", []);

    // Call auto-exercise, expecting it to execute correctly
    await coveredCall.autoExercise();

    // Ensure contract balance is zero
    expect(await ethers.provider.getBalance(ccAddr)).to.equal(0n);
});

});
