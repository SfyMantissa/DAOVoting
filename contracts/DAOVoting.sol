// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.8;

import "./YetAnotherCoin.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title A DAO proposal voting implementation with ERC-20 tokens.
/// @author Sfy Mantissa
contract DAOVoting is AccessControl {

    using Counters for Counters.Counter;
    Counters.Counter private proposalId;

    /// @dev Chairman role (primarily for proposal creation).
    bytes32 public constant CHAIRMAN_ROLE = keccak256("CHAIRMAN_ROLE");

    /// @dev DAO role (executes changes which get voted for).
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    /// @dev Mapping of users to their deposits.
    mapping(address => uint256) public userToDeposit;

    /// @dev Mapping of users to the proposals in which they've recently voted.
    ///      Needed for the withdrawal logic to function correctly.
    mapping(address => uint256) public userToLastProposalId;

    /// @dev List of proposals is stored on-chain.
    mapping(uint256 => Proposal) public proposals;

    struct Proposal {
        mapping(address => bool) voterHasVoted;
        uint256 startTimeStamp;
        uint256 voteCount;
        uint256 positiveVoteCount;
        bool isFinished;
        bytes callData;
        address recipient;
        string description;
    }

    /// @dev The instance of token, which is used to make votes.
    ///      1 vote == 1 token.
    IYetAnotherCoin public token;

    /// @dev Minimum amount of votes required to consider the vote successful.
    uint256 public minimumQuorum;

    /// @dev Time period in which new votes are accepted (in seconds).
    uint256 public debatingPeriodDuration;

    /// @dev Must trigger when new deposits are made by the users.
    event DepositMade(
      address deponent,
      uint256 amount
    );

    /// @dev Must trigger when new proposals are added by the chairman.
    event ProposalAdded(
      uint256 proposalId,
      string description,
      uint256 startTimeStamp,
      address recipient
    );

    /// @dev Must trigger when new votes are casted by the user.
    event VoteCasted(
      uint256 proposalId,
      address voter,
      bool decision,
      uint256 votes
    );

    /// @dev Must trigger when a proposal is finished.
    event ProposalFinished(
      uint256 proposalId,
      string description,
      bool decision,
      uint256 positiveVoteCount,
      uint256 voteCount
    );

    /// @dev Must trigger when the users withdraw their tokens.
    event WithdrawalMade(
      address deponent,
      uint256 amount
    );

    /// @dev Some initial values are set in the constructor.
    /// @param _chairman Address of the chairman (makes new proposals).
    /// @param _voteToken Address of the token used to cast votes.
    /// @param _minimumQuorum Minimal amount of votes.
    /// @param _debatingPeriodDuration Voting period in seconds.
    constructor
    (
        address _chairman,
        address _voteToken,
        uint256 _minimumQuorum,
        uint256 _debatingPeriodDuration
    )
    {
        _setupRole(CHAIRMAN_ROLE, _chairman);
        _setupRole(DAO_ROLE, address(this));
        token = IYetAnotherCoin(_voteToken);
        minimumQuorum = _minimumQuorum;
        debatingPeriodDuration = _debatingPeriodDuration;
    }

    /// @dev Used to deposit tokens.
    ///      Emits `DepositMade`.
    /// @param _amount The amount of tokens to deposit.
    function deposit(uint256 _amount) 
      external 
    {
      require(
          token.balanceOf(msg.sender) >= _amount,
          "ERROR: Not enough tokens."
      );

      token.transferFrom(msg.sender, address(this), _amount);
      userToDeposit[msg.sender] += _amount;

      emit DepositMade(msg.sender, _amount);
    }

    /// @dev Used to add new proposals.
    ///      Can only be called by the chairman.
    ///      Emits `ProposalAdded`.
    /// @param _callData Function signature used if the vote succeeded.
    /// @param _recipient Address of the contract to use the `_callData` upon.
    /// @param _description General description of proposed change.
    function addProposal
    (
      bytes memory _callData,
      address _recipient,
      string memory _description
    ) 
      external
    {
      require(
        hasRole(CHAIRMAN_ROLE, msg.sender), 
        "ERROR: Caller is not the chairman."
      );

      proposalId.increment();
      Proposal storage proposal = proposals[proposalId.current()];

      uint256 startTimeStamp = block.timestamp;
      proposal.startTimeStamp = startTimeStamp;
      proposal.recipient = _recipient;
      proposal.description = _description;
      proposal.callData = _callData;

      emit ProposalAdded(
          proposalId.current(),
          _description,
          startTimeStamp,
          _recipient
      );
    }

    /// @dev Used to cast votes by users.
    ///      Emits `VoteCasted`.
    /// @param _proposalId The ID of the proposal.
    /// @param _decision `true` if user votes `for`, `false` otherwise.
    function vote
    (
      uint256 _proposalId,
      bool _decision
    ) 
      external 
    {
      Proposal storage proposal = proposals[_proposalId];

      require(
          proposalId.current() >= _proposalId,
          "ERROR: No proposal with such ID."
      );

      require(
          !proposal.isFinished,
          "ERROR: This proposal voting is already finished."
      );

      require(
          block.timestamp <= proposal.startTimeStamp + debatingPeriodDuration,
          "ERROR: This proposal voting no longer accepts new votes."
      );

      require(
          !proposal.voterHasVoted[msg.sender],
          "ERROR: You can only vote once."
      );

      require(userToDeposit[msg.sender] > 0, "ERROR: No tokens deposited.");

      uint256 votes = userToDeposit[msg.sender];
      userToLastProposalId[msg.sender] = _proposalId;
      proposal.voteCount += votes;
      proposal.voterHasVoted[msg.sender] = true;
      if (_decision) proposal.positiveVoteCount += votes;

      emit VoteCasted(_proposalId, msg.sender, _decision, votes);
    }

    /// @dev Used to finish the proposal voting.
    ///      Unlike `addProposal` may be called by anyone.
    ///      Emits `ProposalFinished`.
    /// @param _proposalId The ID of the proposal.
    function finishProposal(uint256 _proposalId)
      external
    {
      Proposal storage proposal = proposals[_proposalId];

      require(
          proposalId.current() >= _proposalId,
          "ERROR: No proposal with such ID."
      );
      require(
          block.timestamp > proposal.startTimeStamp + debatingPeriodDuration,
          "ERROR: Proposal voting cannot be finished prematurely."
      );

      require(
          !proposal.isFinished,
          "ERROR: This proposal voting is already finished."
      );

      bool decision;
      uint256 negativeVoteCount = proposal.voteCount -
          proposal.positiveVoteCount;

      if (
          proposal.voteCount >= minimumQuorum &&
          proposal.positiveVoteCount > negativeVoteCount
      ) {
          callFunction(proposal.recipient, proposal.callData);
          decision = true;
      } else {
          decision = false;
      }
      proposal.isFinished = true;

      emit ProposalFinished(
          _proposalId,
          proposal.description,
          decision,
          proposal.positiveVoteCount,
          proposal.voteCount
      );
    }

    /// @dev Used to withdraw tokens by the users.
    ///      Users may only withdraw tokens when all the votes they've 
    ///      voted in concluded.
    ///      Emits `WithdrawalMade`.
    function withdraw() 
      external
    {
      uint256 lastProposalId = userToLastProposalId[msg.sender];
      uint256 balance = userToDeposit[msg.sender];

      require(
          proposals[lastProposalId].isFinished || lastProposalId == 0,
          "ERROR: Must wait until proposal voting is finished."
      );

      token.transfer(msg.sender, balance);
      userToDeposit[msg.sender] -= balance;

      emit WithdrawalMade(msg.sender, balance);
    }

    /// @dev Used to change the minimumQuorum value.
    ///      Can only be called by the chairman or DAO.
    /// @param _value The new minimumQuorum value.
    function setMinimumQuorum(uint256 _value)
      external
    {
      require(
        hasRole(CHAIRMAN_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender), 
        "ERROR: Caller is not the chairman or DAO."
      );

        minimumQuorum = _value;
    }

    /// @dev Used to change the debatingPeriodDuration value.
    ///      Can only be called by the chairman or DAO.
    /// @param _value The new debatingPeriodDuration value.
    function setDebatingPeriodDuration(uint256 _value)
      external
    {
      require(
        hasRole(CHAIRMAN_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender), 
        "ERROR: Caller is not the chairman or DAO."
      );

        debatingPeriodDuration = _value;
    }

    function callFunction
    (
      address recipient,
      bytes memory signature
    )
      internal 
    {
      (bool success, ) = recipient.call(signature);
      require(success, "ERROR: External function call by signature failed.");
    }

}
