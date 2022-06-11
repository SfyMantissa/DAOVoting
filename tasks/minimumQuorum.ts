import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("minimumQuorum",
  "Get the current minimumQuorum value.")
  .setAction(async (_, { ethers }) => {

    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);
    const minimumQuorum = await daoVoting.minimumQuorum();

    console.log("minimumQuorum value is " + minimumQuorum + " votes.");
  });

