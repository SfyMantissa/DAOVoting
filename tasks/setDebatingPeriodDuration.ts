import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("setDebatingPeriodDuration",
  "Set the debatingPeriodDuration value.")
  .addParam("signer", "ID of the signer used to make the call.")
  .addParam("value", "The new value.")
  .setAction(async (args, { ethers }) => {
    const signerArray = await ethers.getSigners();
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);

    const previousValue = await daoVoting.debatingPeriodDuration();
    await daoVoting.connect(signerArray[args.signer]).setDebatingPeriodDuration(args.value);

    console.log("debatingPeriodDuration value has been changed from "
      + previousValue + " to " + args.value + ".")
  });

