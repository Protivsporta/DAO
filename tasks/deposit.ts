import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task("deposit", "Deposit vote tokens to contract address")
  .addParam("amount", "Amount of vote tokens to transfer")
  .setAction(async (taskArgs, hre) => {
    const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_CONTRACT_ADDR!);
    await dao.deposit(taskArgs.amount);
    console.log(`${taskArgs.amount} tokens was deposited to DAO contract!`);
  });