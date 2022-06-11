import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("withdraw",
  "Withdraw the tokens after all the proposal votes concluded.")
  .addParam("signer", "ID of the signer used to make the call.")
  .setAction(async (args, { ethers }) => {
    const signerArray = await ethers.getSigners();
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);

    const txWithdraw = daoVoting.connect(signerArray[args.signer]).withdraw();
    const rWithdraw = await (await txWithdraw).wait();

    const deponent = rWithdraw.events[1].args[0];
    const amount = rWithdraw.events[1].args[1];

    console.log(deponent + " has withdrawn " + amount + " tokens.");
  });

