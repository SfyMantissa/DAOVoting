import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("userToLastProposalId",
  "Get the last proposal voting ID where the user voted.")
  .addParam("user", "The user's address.")
  .setAction(async (args, { ethers }) => {
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);

    const proposalId = await daoVoting.userToLastProposalId(args.user);

    if (Number(proposalId) == 0) {
      console.log("User " + args.user + " didn't vote yet.");
    } else {
      console.log("User " + args.user
        + " has last voted in proposal voting with ID " + proposalId + ".");
    }
  });
