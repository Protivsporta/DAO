import { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { DAO, ERC20Mock } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

describe("DAO", function() {
    const debatingPeriodDuration: number = 86400;  // 1 day in seconds
    const minimumQuorum: number = 2;
    const erc20InitialSupply: number = 100000000000;

    let dao: DAO;
    let voteToken: ERC20Mock;
    let chairPerson: SignerWithAddress;
    let voter: SignerWithAddress;

    beforeEach(async function() {
        [chairPerson, voter] = await ethers.getSigners();

        const VoteToken = await ethers.getContractFactory("ERC20Mock", chairPerson);
        voteToken = await VoteToken.deploy("VoteToken", "VTK", erc20InitialSupply);
        await voteToken.deployed();

        const DAO = await ethers.getContractFactory("DAO");
        dao = await DAO.deploy(chairPerson.address, voteToken.address, minimumQuorum, debatingPeriodDuration);
        await dao.deployed();

        await voteToken.transfer(voter.address, 1000);
    })

    it("Should be deployed", async function() {
        expect(dao.address).to.be.properAddress;
    })

    describe("Deposit", function() {

        it("Should deposit 100 tokens to contract", async function() {
            await voteToken.approve(dao.address, 100);

            await expect(() => dao.deposit(100))
            .to.changeTokenBalance(voteToken, dao, 100)
        })

    })

    describe("Withdraw", function() {

        it("Should withdraw 100 tokens from contract to voter", async function() {
            await voteToken.connect(voter).approve(dao.address, 100);
            await dao.connect(voter).deposit(100);

            await expect(() => dao.connect(voter).withdraw(voter.address, 100))
            .to.changeTokenBalance(voteToken, voter, 100)
        })

        it("Should revert error message because amount to withdraw greater then deposit", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            await expect(dao.withdraw(voter.address, 150))
            .to.be.revertedWith("You are not allowed to withdraw this amount")
        })

        it("Should revert error message because voter has not finished proposals", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.vote(0, true);

            await expect(dao.withdraw(voter.address, 100))
            .to.be.revertedWith("You can not withdraw if you have not finished proposals")
            
        })
    })

    describe("Vote", function() {

        it("Should vote 100 tokens for proposal", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.vote(0, true);

            expect((await dao.proposalList(0)).voteFor)
            .to.equal(100)
        })

        it("Should vote 100 tokens against proposal", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.vote(0, false);

            expect((await dao.proposalList(0)).voteAgainst)
            .to.equal(100)
        })

        it("Should revert error message because voter didn't deposit vote tokens", async function() {
            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await expect(dao.vote(0, true))
            .to.be.revertedWith("For particapation you have to deposit tokens");
        })

        it("Should revert error message because voter tried to vote twice", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.vote(0, true);

            await expect(dao.vote(0, false))
            .to.be.revertedWith("You can not vote twice")
        })

        it("Should revert error message because proposal is not added yet", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            await expect(dao.vote(0, true))
            .to.be.revertedWith("Proposal is not on debating fase now")
        })

        it("Should revert error message because proposal has already been debated", async function() {
            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await network.provider.send("evm_increaseTime", [100000]);
            await network.provider.send("evm_mine");

            await expect(dao.vote(0, true))
            .to.be.revertedWith("Proposal has already been debated")
        })
    })

    describe("AddProposal", function() {

        it("Should add proposal and emmit ProposalAdded event", async function() {
            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            expect((await dao.proposalList(0)).recipient)
            .to.be.equal("0x96D67D409741023BB152918F0F951249a7DD6626")

            await expect(dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626"))
            .to.emit(dao, "ProposalAdded")
            .withArgs(1, "0x96D67D409741023BB152918F0F951249a7DD6626")
        })

        it("Should revert error message because sender not chairPerson", async function() {
            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await expect(dao.connect(voter).addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626"))
            .to.be.revertedWith("You are not allowed to add proposal")
        })
    }) 

    describe("Finish", function() {

        it("Should finish proposal debating and emit ProposalAccepted event", async function() {
            await voteToken.connect(voter).approve(dao.address, 100);
            await dao.connect(voter).deposit(100);

            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.connect(voter).vote(0, true);
            await dao.vote(0, true);

            await network.provider.send("evm_increaseTime", [100000]);
            await network.provider.send("evm_mine");

            await expect(dao.finishProposal(0))
            .to.emit(dao, "ProposalAccepted")
            .withArgs(0, "0x96D67D409741023BB152918F0F951249a7DD6626")
        })

        it("Should finish proposal debating and emit ProposalDenied event", async function() {
            await voteToken.connect(voter).approve(dao.address, 100);
            await dao.connect(voter).deposit(100);

            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.connect(voter).vote(0, false);
            await dao.vote(0, false);

            await network.provider.send("evm_increaseTime", [100000]);
            await network.provider.send("evm_mine");

            await expect(dao.finishProposal(0))
            .to.emit(dao, "ProposalDenied")
            .withArgs(0, "0x96D67D409741023BB152918F0F951249a7DD6626")
        })

        it("Should decrease number of active proposals for sender", async function() {
            await voteToken.connect(voter).approve(dao.address, 100);
            await dao.connect(voter).deposit(100);

            await voteToken.approve(dao.address, 100);
            await dao.deposit(100);

            const data: Uint8Array = new Uint8Array(); // generates empty Uint8Array

            await dao.addProposal(data, "0x96D67D409741023BB152918F0F951249a7DD6626");

            await dao.connect(voter).vote(0, true);
            await dao.vote(0, true);

            await network.provider.send("evm_increaseTime", [100000]);
            await network.provider.send("evm_mine");

            await dao.finishProposal(0);

            expect((await dao.votersList(voter.address)).numberOfActiveProposals)
            .to.be.equal(1)
        })
    })


})