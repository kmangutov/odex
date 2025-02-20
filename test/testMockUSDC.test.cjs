const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Test MockUSDC Contract", function () {
  let owner, buyer, mockUSDC, newWallet, newAccount;
  const amountToMint = ethers.parseUnits("1000", 6); // 1000 USDC
  const transferAmount = ethers.parseUnits("100", 6); // 100 USDC

  beforeEach(async function () {
    [owner, buyer] = await ethers.getSigners();

    // Generate a new wallet (private/public key pair) and connect it to Hardhat provider
    newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
    newAccount = newWallet.address;
    console.log("New Account:", newAccount);

    // Deploy Mock USDC contract
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    console.log("Mock USDC deployed to:", mockUSDC.target);

    // Mint USDC to the new account
    await mockUSDC.mint(newAccount, amountToMint);

    // Fund the new wallet with ETH so it can pay for transactions
    await owner.sendTransaction({
      to: newAccount,
      value: ethers.parseEther("1"), // 1 ETH for gas fees
    });

    // Verify minting
    const balance = await mockUSDC.balanceOf(newAccount);
    console.log("New Account's USDC Balance:", ethers.formatUnits(balance, 6));
  });

  it("should allow minting tokens to a new account", async function () {
    const newAccountBalance = await mockUSDC.balanceOf(newAccount);
    expect(newAccountBalance).to.equal(amountToMint);
  });

  it("should allow the buyer to spend tokens", async function () {
    // Connect the new wallet to the USDC contract
    const mockUSDCWithNewWallet = mockUSDC.connect(newWallet);

    // Approve the buyer to spend USDC on behalf of newAccount
    const approveTx = await mockUSDCWithNewWallet.approve(buyer.address, transferAmount);
    await approveTx.wait();
    console.log(`Approved ${ethers.formatUnits(transferAmount, 6)} USDC to Buyer`);

    // Debug: Check allowance
    const allowance = await mockUSDC.allowance(newAccount, buyer.address);
    console.log(`Allowance before transfer: ${ethers.formatUnits(allowance, 6)} USDC`);

    // Ensure `buyer` calls `transferFrom`
    const mockUSDCWithBuyer = mockUSDC.connect(buyer);
    await mockUSDCWithBuyer.transferFrom(newAccount, buyer.address, transferAmount);

    // Verify the buyer's balance
    const buyerBalance = await mockUSDC.balanceOf(buyer.address);
    console.log("Buyer USDC Balance:", ethers.formatUnits(buyerBalance, 6));
    expect(buyerBalance).to.equal(transferAmount);
  });
});
