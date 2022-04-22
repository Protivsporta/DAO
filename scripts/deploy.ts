import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const DAO = await ethers.getContractFactory("DAO", signer);
  const dao = await DAO.deploy("0x7Ac51e9D2C3daC0f401dd546F27b36d49cE2FB7c", "0x187DF924142ebb202134ED8e92065507Ad7fC739", 3, 86400);

  await dao.deployed();

  console.log("DAO contract deployed to:", dao.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});