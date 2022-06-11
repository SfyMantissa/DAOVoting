import { expect } from "chai";
import { ethers } from "hardhat";
const hre = require("hardhat");
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import config from "../config";

describe("DAOVoting", () => {

  let daoVoting: Contract;
  let yetAnotherCoin: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let description1: String;
  let description2: String;

  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    daoVoting = await DAOVoting.deploy(
      owner.address,
      config.YAC_RINKEBY_ADDRESS,
      100,
      259200
    );
    await daoVoting.deployed();

    const YetAnotherCoin = await ethers.getContractFactory("YetAnotherCoin");
    yetAnotherCoin = YetAnotherCoin.attach(config.YAC_RINKEBY_ADDRESS);
  });

  describe("Before the debating period has passed", () => {
    it("deposit: should revert if user doesn't have enough tokens.", async () => {
      await yetAnotherCoin.connect(owner).mint(owner.address, 1000);
      await yetAnotherCoin.connect(owner).approve(daoVoting.address, 1000);

      await expect(daoVoting.connect(owner).deposit(2000)).to.be.revertedWith("ERROR: Not enough tokens.");
    });

    it("deposit: should be able to successfully deposit 1000 tokens.", async () => {
      const txDeposit = daoVoting.connect(owner).deposit(1000);
      const rDeposit = await (await txDeposit).wait();

      expect(rDeposit.events[1].args[0]).to.equal(owner.address);
      expect(rDeposit.events[1].args[1]).to.equal(1000);
    });

    it("setMinimumQuorum: should revert because caller is not the chairman or DAO.", async () => {
      await expect(daoVoting.connect(user1).setMinimumQuorum(245)).to.be.revertedWith("ERROR: Caller is not the chairman or DAO.");
    })

    it("setDebatingPeriodDuration: should revert because caller is not the chairman or DAO.", async () => {
      await expect(daoVoting.connect(user1).setDebatingPeriodDuration(2000)).to.be.revertedWith("ERROR: Caller is not the chairman or DAO.");
    });

    it("setMinimumQuorum: should be able to set a new minimumQuorum value.", async () => {
      await daoVoting.connect(owner).setMinimumQuorum(200);
      expect(await daoVoting.connect(owner).minimumQuorum()).to.equal(200);
    })

    it("setDebatingPeriodDuration: should be able to set a new debatingPeriodDuration value.", async () => {
      await daoVoting.connect(owner).setDebatingPeriodDuration(86400);
      expect(await daoVoting.connect(owner).debatingPeriodDuration()).to.equal(86400);
    });

    it("addProposal: should revert because caller is not the chairman.", async () => {
      const jsonAbi = [{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "setMinimumQuorum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const iface = new ethers.utils.Interface(jsonAbi);
      const calldata = iface.encodeFunctionData('setMinimumQuorum', [600]);
      description1 = "Change minimum quorum to 600 votes.";

      await expect(daoVoting.connect(user1).addProposal(calldata, daoVoting.address, description1)).to.be.revertedWith("ERROR: Caller is not the chairman.");
    });

    it("addProposal: should be able to add a new proposal.", async () => {
      const jsonAbi = [{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "setMinimumQuorum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const iface = new ethers.utils.Interface(jsonAbi);
      const calldata = iface.encodeFunctionData('setMinimumQuorum', [600]);
      description1 = "Change minimum quorum to 600 votes.";

      const txAddProposal = daoVoting.connect(owner).addProposal(calldata, daoVoting.address, description1);
      const rAddProposal = await (await txAddProposal).wait();

      expect(rAddProposal.events[0].args[0]).to.equal(1);
      expect(rAddProposal.events[0].args[1]).to.equal(description1);
      expect(rAddProposal.events[0].args[3]).to.equal(daoVoting.address);
    });

    it("vote: should revert given a non-exisitng proposal ID.", async () => {
      await expect(daoVoting.connect(owner).vote(20, false)).to.be.revertedWith("ERROR: No proposal with such ID.");
    });

    it("vote: should revert given user didn't deposit anything.", async () => {
      await expect(daoVoting.connect(user1).vote(1, false)).to.be.revertedWith("ERROR: No tokens deposited.");
    });

    it("vote: should be able to case a vote as owner.", async () => {
      const txVote = daoVoting.connect(owner).vote(1, true);
      const rVote = await (await txVote).wait();

      expect(rVote.events[0].args[0]).to.equal(1);
      expect(rVote.events[0].args[1]).to.equal(owner.address);
      expect(rVote.events[0].args[2]).to.equal(true);
      expect(rVote.events[0].args[3]).to.equal(1000);
    });

    it("vote: should revert if owner tries to vote again.", async () => {
      await expect(daoVoting.connect(owner).vote(1, false)).to.be.revertedWith("ERROR: You can only vote once.");
    });

    it("finishProposal: should revert given a non-existing proposal ID.", async () => {
      await expect(daoVoting.connect(owner).finishProposal(20)).to.be.revertedWith("ERROR: No proposal with such ID.");
    });

    it("finishProposal: should revert given debatingPeriodDuration did not pass yet.", async () => {
      await expect(daoVoting.connect(owner).finishProposal(1)).to.be.revertedWith("ERROR: Proposal voting cannot be finished prematurely.");
    });

    it("vote: should be able to cast a vote as user.", async () => {
      await yetAnotherCoin.connect(user1).mint(user1.address, 500);
      await yetAnotherCoin.connect(user1).approve(daoVoting.address, 500);
      await daoVoting.connect(user1).deposit(500);

      const txVote = daoVoting.connect(user1).vote(1, false);
      const rVote = await (await txVote).wait();

      expect(rVote.events[0].args[0]).to.equal(1);
      expect(rVote.events[0].args[1]).to.equal(user1.address);
      expect(rVote.events[0].args[2]).to.equal(false);
      expect(rVote.events[0].args[3]).to.equal(500);
    });

    it("withdraw: should revert because the proposal voting didn't finish yet.", async () => {
      await expect(daoVoting.connect(owner).withdraw()).to.be.revertedWith("ERROR: Must wait until proposal voting is finished.");
    });
  });

  describe("After the debating period has passed", () => {
    it("vote: should revert because the proposal voting no longer accepts new votes.", async () => {
      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60]);
      await yetAnotherCoin.connect(user2).mint(user2.address, 700);
      await yetAnotherCoin.connect(user2).approve(daoVoting.address, 700);
      await daoVoting.connect(user2).deposit(700);

      expect(daoVoting.connect(user2).vote(1, true)).to.be.revertedWith("ERROR: This proposal voting no longer accepts new votes.");
    });

    it("finishProposal: should be able to finish the proposal with a positive decision.", async () => {
      const txFinishProposal = daoVoting.connect(owner).finishProposal(1);
      const rFinishProposal = await (await txFinishProposal).wait();

      expect(rFinishProposal.events[0].args[0]).to.equal(1);
      expect(rFinishProposal.events[0].args[1]).to.equal(description1);
      expect(rFinishProposal.events[0].args[2]).to.equal(true);
      expect(rFinishProposal.events[0].args[3]).to.equal(1000);
      expect(rFinishProposal.events[0].args[4]).to.equal(1500);
      expect(await daoVoting.connect(owner).minimumQuorum()).to.equal(600);
    });

    it("vote: should revert because the proposal voting is already finished.", async () => {
      expect(daoVoting.connect(user2).vote(1, true)).to.be.revertedWith("ERROR: This proposal voting is already finished.");
    });

    it("finishProposal: should revert because this proposal voting is already finished.", async () => {
      await expect(daoVoting.connect(owner).finishProposal(1)).to.be.revertedWith("ERROR: This proposal voting is already finished.");
    });

    it("withdraw: should be able to withdraw the tokens as owner.", async () => {
      const balance = await daoVoting.connect(owner).userToDeposit(owner.address);

      const txWithdraw = daoVoting.connect(owner).withdraw();
      const rWithdraw = await (await txWithdraw).wait();

      expect(rWithdraw.events[1].args[0]).to.equal(owner.address);
      expect(rWithdraw.events[1].args[1]).to.equal(balance);
    });
  });

  describe("Special cases", () => {
    it("addProposal → vote → finishProposal: case where minimumQuorum isn't reached.", async () => {
      const jsonAbi = [{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "setMinimumQuorum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const iface = new ethers.utils.Interface(jsonAbi);
      const calldata = iface.encodeFunctionData('setMinimumQuorum', [1000]);
      description2 = "Change minimum quorum to 1000 votes.";

      await daoVoting.connect(owner).addProposal(calldata, daoVoting.address, description2);
      await daoVoting.connect(user1).vote(2, false);
      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60]);

      const txFinishProposal = daoVoting.finishProposal(2);
      const rFinishProposal = await (await txFinishProposal).wait();

      expect(rFinishProposal.events[0].args[0]).to.equal(2);
      expect(rFinishProposal.events[0].args[1]).to.equal(description2);
      expect(rFinishProposal.events[0].args[2]).to.equal(false);
      expect(rFinishProposal.events[0].args[3]).to.equal(0);
      expect(rFinishProposal.events[0].args[4]).to.equal(500);
    });

    it("addProposal → vote → finishProposal: case where minimumQuorum is reached, but the decision is negative.", async () => {
      const jsonAbi = [{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "setMinimumQuorum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const iface = new ethers.utils.Interface(jsonAbi);
      const calldata = iface.encodeFunctionData('setMinimumQuorum', [1000]);
      description2 = "Change minimum quorum to 1000 votes.";

      await daoVoting.connect(owner).addProposal(calldata, daoVoting.address, description2);
      await daoVoting.connect(user1).vote(3, true);
      await daoVoting.connect(user2).vote(3, false);
      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60]);

      const txFinishProposal = daoVoting.finishProposal(3);
      const rFinishProposal = await (await txFinishProposal).wait();

      expect(rFinishProposal.events[0].args[0]).to.equal(3);
      expect(rFinishProposal.events[0].args[1]).to.equal(description2);
      expect(rFinishProposal.events[0].args[2]).to.equal(false);
      expect(rFinishProposal.events[0].args[3]).to.equal(500);
      expect(rFinishProposal.events[0].args[4]).to.equal(1200);
    });

    it("addProposal → vote → finishProposal: case where the decision is positive, but the external function call fails.", async () => {
      const jsonAbi = [{
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_value",
            "type": "uint256"
          }
        ],
        "name": "setNonExistingThing",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }];
      const iface = new ethers.utils.Interface(jsonAbi);
      const calldata = iface.encodeFunctionData('setNonExistingThing', [1000]);
      description2 = "Change minimum quorum to 1000 votes.";

      await daoVoting.connect(owner).addProposal(calldata, daoVoting.address, description2);
      await daoVoting.connect(user1).vote(4, false);
      await daoVoting.connect(user2).vote(4, true);
      await ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60]);

      await expect(daoVoting.finishProposal(4)).to.be.revertedWith("ERROR: External function call by signature failed.");
    });
  });
});
