import * as fs from 'fs';
import { ethers } from "hardhat";
import config from '../config';

const updateDeploymentAddress = async (address: string) => {
  let config: string = './config.ts';
  fs.readFile(config, 'utf-8', (err: unknown, data: string) => {
    if (err) throw err;
    let regex = /DAOVOTING_ADDRESS: ".*",/g;
    let update = data.replace(
      regex,
      'DAOVOTING_ADDRESS: "' + address + '",'
    );

    fs.writeFile(config, update, 'utf-8', (err: unknown) => {
      if (err) throw err;
      console.log('Updated DAOVOTING_ADDRESS in config.ts.');
    });
  });
};

const main = async () => {
  const signerArray = await ethers.getSigners();
  const DAOVoting = await ethers.getContractFactory("DAOVoting");
  const daoVoting = await DAOVoting.deploy(
    signerArray[0].address,
    "0xB069A157Ed653d91765eA1E8bAc5c18454A83Ba4",
    4,
    259200
  );
  await daoVoting.deployed();
  console.log("DAO voting deployed to:", daoVoting.address);
  updateDeploymentAddress(daoVoting.address);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
