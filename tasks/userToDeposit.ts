import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("userToDeposit",
  "Get the user's deposit value.")
  .addParam("user", "The user's address.")
  .setAction(async (args, { ethers }) => {
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);

    const deposit = await daoVoting.userToDeposit(args.user);

    console.log("User " + args.user + " has " + deposit
      + " tokens deposited.")
  });
