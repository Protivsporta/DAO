//SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DAO {

    using SafeERC20 for IERC20;

    IERC20 public voteToken;

    uint256 public debatingPeriodDuration;
    uint256 public minimumQuorum;
    uint256 public proposalId;
    address public chairPerson;

    struct Proposal {
        bytes data;
        address recipient;
        uint256 initialTimestamp;
        uint256 voteFor;
        uint256 voteAgainst;
        address[] voters;
    }

    struct voter {
        uint256 depositAmount;
        uint256 numberOfActiveProposals;
    }

    mapping (address => voter) public votersList;

    mapping (uint256 => Proposal) public proposalList; 

    mapping (uint256 => mapping (address => bool)) public voterToProposal;

    constructor (address _chairPerson, address _voteToken, uint256 _minimumQuorum, uint256 _debatingPeriodDuration) {
        chairPerson = _chairPerson;
        voteToken = IERC20(_voteToken);
        debatingPeriodDuration = _debatingPeriodDuration;
        minimumQuorum = _minimumQuorum;
    }

    // Functions

    function deposit (uint256 _amount) public {
        votersList[msg.sender].depositAmount += _amount;
        voteToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdraw (address _to, uint256 _amount) public {
        require(votersList[msg.sender].numberOfActiveProposals == 0, "You can not withdraw if you have not finished proposals");
        require(votersList[msg.sender].depositAmount >= _amount, "You are not allowed to withdraw this amount");
        votersList[msg.sender].depositAmount -= _amount;
        voteToken.safeTransfer(_to, _amount);
    }

    function addProposal (bytes memory _data, address _recipient) public onlyChairPerson {
        Proposal storage newProposal = proposalList[proposalId];
        newProposal.data = _data;
        newProposal.recipient = _recipient;
        newProposal.initialTimestamp = block.timestamp;
        proposalList[proposalId] = newProposal;
        emit ProposalAdded(proposalId, _recipient);
        proposalId ++;
    }

    function vote (uint256 _proposalId, bool _vote) public {
        require(votersList[msg.sender].depositAmount > 0, "For particapation you have to deposit tokens");
        require(voterToProposal[_proposalId][msg.sender] == false, "You can not vote twice");
        require(proposalList[_proposalId].initialTimestamp != 0, "Proposal is not on debating fase now");
        require(proposalList[_proposalId].initialTimestamp + debatingPeriodDuration > block.timestamp, "Proposal has already been debated");
        voterToProposal[_proposalId][msg.sender] = true;
        votersList[msg.sender].numberOfActiveProposals ++;
        proposalList[_proposalId].voters.push(msg.sender);
        if(_vote == true) {
            proposalList[_proposalId].voteFor += votersList[msg.sender].depositAmount;
        } else {
            proposalList[_proposalId].voteAgainst += votersList[msg.sender].depositAmount;
        }
    }

    function finishProposal (uint256 _proposalId) public {
        require(block.timestamp > proposalList[_proposalId].initialTimestamp + debatingPeriodDuration, "Too early to finish proposal");
        require(proposalList[_proposalId].voters.length >= minimumQuorum, "A minimal number of votes is not achievment");
        Proposal memory proposal = proposalList[_proposalId];
        if(proposal.voteFor > proposal.voteAgainst) {
            (bool success,) = proposal.recipient.call{value: 0}(proposal.data);
            if(success) {
                emit ProposalAccepted(_proposalId, proposalList[_proposalId].recipient);
                decreaseNumberOfActiveProposals(_proposalId);
            } else {
                emit FailedFinish(_proposalId);
            }
        } else {
            emit ProposalDenied(_proposalId, proposalList[_proposalId].recipient);
            decreaseNumberOfActiveProposals(_proposalId);
        }
    }

    function decreaseNumberOfActiveProposals(uint256 _proposalId) internal {
        for (uint256 i=0; proposalList[_proposalId].voters.length > i; i++) {
            votersList[proposalList[_proposalId].voters[i]].numberOfActiveProposals -= 1; // decrease number of active proposals for voter
        }
    }

    // Modifiers

    modifier onlyChairPerson() {
        require(msg.sender == chairPerson, "You are not allowed to add proposal");
        _;
    }

    // Events

    event ProposalAdded(uint256 _proposalId, address indexed _recipient);

    event ProposalAccepted(uint256 _proposalId, address indexed _recipient);

    event ProposalDenied(uint256 _proposalId, address indexed _recipient);

    event FailedFinish(uint256 _proposalId);

}