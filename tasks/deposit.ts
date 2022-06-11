import "@nomiclabs/hardhat-ethers";
import { task } from "hardhat/config";
import config from '../config';

task("deposit",
  "Deposit tokens to use for proposal voting.")
  .addParam("signer", "ID of the signer used to make the call.")
  .addParam("amount", "Amount of tokens to deposit.")
  .setAction(async (args, { ethers }) => {
    const signerArray = await ethers.getSigners();
    const DAOVoting = await ethers.getContractFactory("DAOVoting");
    const daoVoting = DAOVoting.attach(config.DAOVOTING_ADDRESS);

    const YetAnotherCoin = await ethers.getContractFactory("YetAnotherCoin");
    const yetAnotherCoin = YetAnotherCoin.attach(config.YAC_RINKEBY_ADDRESS);

    await yetAnotherCoin.connect(signerArray[args.signer]).approve(config.DAOVOTING_ADDRESS, args.amount);
    const txDeposit = daoVoting.connect(signerArray[args.signer]).deposit(args.amount);
    const rDeposit = await (await txDeposit).wait();

    const deponent = rDeposit.events[1].args[0];
    const amount = rDeposit.events[1].args[1];

    console.log(deponent + " deposited " + amount + " tokens.")
  });

