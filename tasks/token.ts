import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("token",
  "Get the current token value (the token used for proposal voting).")
  .setAction(async (_, { ethers }) => {
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);
    const token = await daoVoting.token();

    console.log("token value is " + token + ".");
  });

