import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task("add_proposal", "Add proposal to debating")
  .addParam("data", "Call function argument")
  .addParam("recipient", "Address of contract to state change")
  .setAction(async (taskArgs, hre) => {
    const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_CONTRACT_ADDR!);
    await dao.addProposal(taskArgs.data, taskArgs.recipient);
    console.log(`${taskArgs.amount} tokens was deposited to DAO contract!`);
  });