import "@nomiclabs/hardhat-ethers";
import { ethers } from "hardhat";
import { CovenCats } from "../../typechain";
import { BigNumberish, Signer } from "ethers";

import { CATS, SalePhase } from "../../src/contractConstants";

// convert the floating point number to a clean number with two decimal places
export function getExactTotalPrice(price: string, numberOfTokens: number) {
  return Math.round(parseFloat(price) * numberOfTokens * 100) / 100;
}

export async function setSalePhase(
  contract: CovenCats, newPhase: SalePhase
) {
  return await (await contract.setSalePhase(newPhase)).wait();
}

export async function mintPublicSale(
  contract: CovenCats,
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
  contract: CovenCats,
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
  contract: CovenCats,
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
  contract: CovenCats,
  merkleRoot: string
) {
  return await (await contract.setWitchListMerkleRoot(merkleRoot)).wait();
}

export async function setMeowListMerkleRoot(
  contract: CovenCats,
  merkleRoot: string
) {
  return await (await contract.setMeowListMerkleRoot(merkleRoot)).wait();
}

export async function reserveForGifting(
  contract: CovenCats,
  numberToReserve: number
) {
  return await (await contract.reserveForGifting(numberToReserve)).wait();
}

export async function giftCats(contract: CovenCats, users: Signer[]) {
  const addresses = await Promise.all(users.map((user) => user.getAddress()));
  return await (await contract.giftWitches(addresses)).wait();
}

export async function getRoyaltyInfo(
  contract: CovenCats,
  tokenId: BigNumberish,
  salePrice: string
) {
  return await contract.royaltyInfo(
    tokenId,
    ethers.utils.parseEther(salePrice)
  );
}

export async function withdraw(contract: CovenCats) {
  return await (await contract.withdraw()).wait();
}
