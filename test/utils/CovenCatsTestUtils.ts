import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";
import { BigNumberish, Contract, Signer } from "ethers";

import { CATS, SalePhase } from "../../src/contractConstants";

// convert the floating point number to a clean number with two decimal places
export function getExactTotalPrice(price: string, numberOfTokens: number) {
  return Math.round(parseFloat(price) * numberOfTokens * 100) / 100;
}

export async function setSalePhase(contract: Contract, newPhase: SalePhase) {
  return await (await contract.setSalePhase(newPhase)).wait();
}

export async function mintPublicSale(
  contract: Contract,
  user: Signer,
  numberOfTokens: number = 1,
  price: string = CATS.PUBLIC_SALE_PRICE_ETH
) {
  return await (
    await contract.connect(user).mint(numberOfTokens, {
      value: ethers.utils.parseEther(
        `${getExactTotalPrice(price, numberOfTokens)}`
      ),
    })
  ).wait();
}

export async function mintWitchSale(
  contract: Contract,
  user: Signer,
  merkleProof: string[],
  numberOfTokens: number = 1,
  price: string = CATS.WITCH_SALE_PRICE_ETH
) {
  return await (
    await contract.connect(user).mintWitchSale(numberOfTokens, merkleProof, {
      value: ethers.utils.parseEther(
        `${getExactTotalPrice(price, numberOfTokens)}`
      ),
    })
  ).wait();
}

export async function mintMeowlistSale(
  contract: Contract,
  user: Signer,
  merkleProof: string[],
  numberOfTokens: number = 1,
  price: string = CATS.PUBLIC_SALE_PRICE_ETH
) {
  return await (
    await contract.connect(user).mintMeowlistSale(numberOfTokens, merkleProof, {
      value: ethers.utils.parseEther(
        `${getExactTotalPrice(price, numberOfTokens)}`
      ),
    })
  ).wait();
}

export async function setWitchListMerkleRoot(
  contract: Contract,
  merkleRoot: string
) {
  return await (await contract.setWitchListMerkleRoot(merkleRoot)).wait();
}

export async function setMeowListMerkleRoot(
  contract: Contract,
  merkleRoot: string
) {
  return await (await contract.setMeowlistMerkleRoot(merkleRoot)).wait();
}

export async function reserveForGifting(
  contract: Contract,
  numberToReserve: number
) {
  return await (await contract.reserveForGifting(numberToReserve)).wait();
}

export async function giftCats(contract: Contract, users: Signer[]) {
  const addresses = await Promise.all(users.map((user) => user.getAddress()));
  return await (await contract.giftCats(addresses)).wait();
}

export async function getRoyaltyInfo(
  contract: Contract,
  tokenId: BigNumberish,
  salePrice: string
) {
  return await contract.royaltyInfo(
    tokenId,
    ethers.utils.parseEther(salePrice)
  );
}

export async function withdraw(contract: Contract) {
  return await (await contract.withdraw()).wait();
}
