/*const { ethers } = require("hardhat");
async function main() {
  const factory = await ethers.getContractFactory("testSwap");
  // If we had constructor arguments, they would be passed into deploy()
  const contract = await factory.deploy();
  await contract.deployed();
  // The address the Contract WILL have once mined
  console.log("Contract deployed to: ", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });*/

async function main() {
const [deployer] = await ethers.getSigners();
console.log("Deploying contracts with the account:", deployer.address);

const MockUSDC = await ethers.getContractFactory("MockUSDC");
const mockUSDC = await MockUSDC.deploy();
console.log("Mock USDC deployed to:", mockUSDC.address);

const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
const simpleSwap = await SimpleSwap.deploy();
console.log("SimpleSwap deployed to:", simpleSwap.address);
}

main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});
  