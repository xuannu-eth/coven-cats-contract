import "@nomiclabs/hardhat-ethers";
import { ethers, upgrades } from "hardhat";

import { OPEN_SEA_PROXY_REGISTRY_ADDRESS } from "./Env";
import { CATS_CONTRACT_NAME } from "./contractConstants";
import { Contract } from "ethers";

export interface ContractUtils<TContract extends Contract> {
  deploy(): Promise<TContract>;

  attach(contractAddress: string): TContract;
}

export async function getCovenCats(): Promise<ContractUtils<Contract>> {
  const Contract = await ethers.getContractFactory(CATS_CONTRACT_NAME);
  return {
    deploy: async () => {
      // Deploy a new smart contract, connected to the first signer by default
      const contract = await upgrades.deployProxy(Contract, [
        OPEN_SEA_PROXY_REGISTRY_ADDRESS,
      ]);

      await contract.deployed();

      return contract;
    },

    attach: (contractAddress: string) => {
      return Contract.attach(contractAddress);
    },
  };
}
