import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task("withdraw", "Withdraw vote tokens to chosen address")
  .addParam("to", "Address which to withdraw vote tokens")
  .addParam("amount", "Amount of vote tokens to transfer")
  .setAction(async (taskArgs, hre) => {
    const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_CONTRACT_ADDR!);
    await dao.withdraw(taskArgs.to, taskArgs.amount);
    console.log(`${taskArgs.amount} tokens was withdrawned from contract to ${taskArgs.to}!`);
  });