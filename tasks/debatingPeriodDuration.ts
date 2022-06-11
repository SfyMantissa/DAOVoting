import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("debatingPeriodDuration",
  "Get the current debatingPeriodDuration value.")
  .setAction(async (_, { ethers }) => {

    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);
    const debatingPeriodDuration = await daoVoting.debatingPeriodDuration();

    console.log("debatingPeriodDuration value is " + debatingPeriodDuration
      + " seconds.");
  });

