import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-ethers';

task("finish_proposal", "Finish chosen proposal")
  .addParam("proposalId", "Identificator of proposal")
  .setAction(async (taskArgs, hre) => {
    const dao = await hre.ethers.getContractAt("DAO", process.env.DAO_CONTRACT_ADDR!);
    await dao.finishProposal(taskArgs.proposalId);
    console.log(`Proposal #${taskArgs.proposalId} was finished!`);
  });