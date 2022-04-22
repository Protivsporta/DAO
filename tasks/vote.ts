import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task("vote", "Vote for or against chosen proposal")
  .addParam("proposalId", "Identificator of proposal")
  .addParam("answer", "Chosen answer true/false")
  .setAction(async (taskArgs, hre) => {
    const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_CONTRACT_ADDR!);
    await dao.vote(taskArgs.proposalId, taskArgs.answer);
    console.log(`Answer ${taskArgs.answer} for proposal #${taskArgs.proposalId} was recorded!`);
  });