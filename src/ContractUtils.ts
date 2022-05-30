import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";
import { CovenCats } from "../typechain";

import { OPEN_SEA_PROXY_REGISTRY_ADDRESS } from "./Env";
import { CATS_CONTRACT_NAME } from "./contractConstants";

type ContractType = CovenCats;

export interface ContractUtils<TContract extends ContractType> {
  deploy(): Promise<TContract>;

  attach(contractAddress: string): TContract;
}

export async function getCovenCats(): Promise<ContractUtils<CovenCats>> {
  const Contract = await ethers.getContractFactory(CATS_CONTRACT_NAME);
  return {
    deploy: async () => {
      // Deploy a new smart contract, connected to the first signer by default
      const contract = await Contract.deploy();

      await contract.deployed();

      return contract;
    },

    attach: (contractAddress: string) => {
      return Contract.attach(contractAddress);
    },
  };
}
