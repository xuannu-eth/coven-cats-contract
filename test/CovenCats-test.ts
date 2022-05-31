import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

import { CATS, SalePhase } from "../src/contractConstants";
import { generateMerkleTree } from "../src/merkle";
import { getCovenCats, ContractUtils } from "../src/ContractUtils";
import * as TestUtils from "./utils/CovenCatsTestUtils";

const { WITCH_SALE_PRICE_ETH, PUBLIC_SALE_PRICE_ETH } = CATS;

describe("CovenCats", function () {
  let contract: Contract;
  let CovenCats: ContractUtils<Contract>;
  beforeEach(async () => {
    CovenCats = await getCovenCats();
    contract = await CovenCats.deploy();
  });

  it("deploys correctly", async function () {
    const [owner] = await ethers.getSigners();

    const ownerBalance = await contract.balanceOf(owner.address);
    expect((await contract.totalSupply()).toNumber()).to.equal(ownerBalance);
  });

  describe("nextTokenId", () => {
    it("starts at tokenId 1", async () => {
      await TestUtils.reserveForGifting(contract, 1);
      expect((await contract.totalSupply()).toNumber()).to.equal(1);
    });
  });

  describe("mint", () => {
    it("mints correctly when public sale is active", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user] = await ethers.getSigners();

      // Grab current eth balance on the contract
      const currentEthBalance = await contract.provider.getBalance(
        contract.address
      );

      // Execute transaction for given user to mint a witch
      await TestUtils.mintPublicSale(contract, user);

      // Assert the new eth balance in the contract reflects the amount
      // of eth transfered, and that ownership of the token is reflected.
      const newEthBalance = await contract.provider.getBalance(
        contract.address
      );
      const expectedTokenId = "1";
      const userCovenBalance = await contract.balanceOf(user.address);
      expect(
        newEthBalance.eq(
          currentEthBalance.add(ethers.utils.parseEther(PUBLIC_SALE_PRICE_ETH))
        )
      ).to.be.true;
      expect(userCovenBalance.eq(1)).to.be.true;
      expect(await contract.ownerOf(expectedTokenId)).to.equal(user.address);
    });

    it("doesn't mint if public sale is not active", async () => {
      const [_owner, user] = await ethers.getSigners();
      try {
        await TestUtils.mintPublicSale(contract, user);
        expect.fail("Minting public sale should fail if it's not active");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }
    });

    it("doesn't mint if number requested is 0", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user] = await ethers.getSigners();
      await TestUtils.mintPublicSale(contract, user, 0);
      expect((await contract.totalSupply()).toNumber()).to.equal(0);
    });

    it("doesn't mint if number requested would exceed limit per wallet", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user] = await ethers.getSigners();

      try {
        await TestUtils.mintPublicSale(contract, user, 4);
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }

      await TestUtils.mintPublicSale(contract, user, 3);
      expect((await contract.totalSupply()).toNumber()).to.equal(3);

      try {
        await TestUtils.mintPublicSale(contract, user, 1);
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(3);
      }
    });

    it("doesn't mint if number requested would exceed max allocation of witches for public sale", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user, ...users] = await ethers.getSigners();
      // Mint 6 tokens first
      for (let user of users.slice(0, 6)) {
        await TestUtils.mintPublicSale(contract, user, 1);
      }
      expect((await contract.totalSupply()).toNumber()).to.equal(6);

      try {
        await TestUtils.mintPublicSale(contract, user, 2);
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(6);
      }

      await TestUtils.mintPublicSale(contract, user, 1);
      expect((await contract.totalSupply()).toNumber()).to.equal(7);

      try {
        await TestUtils.mintPublicSale(contract, user, 1);
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(7);
      }
    });

    it("doesn't mint if eth value sent is insufficient", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user] = await ethers.getSigners();
      const ts = await contract.totalSupply();

      try {
        await TestUtils.mintPublicSale(contract, user, 1, "0.05");
        expect.fail("Minting without sending enough eth should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }

      try {
        await TestUtils.mintPublicSale(contract, user, 2, "0.05");
        expect.fail("Minting without sending enough eth should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }
    });
  });

  describe("mintWitchSale", () => {
    let merkleTree: { [key: string]: string[] } = {};
    beforeEach(async () => {
      const [_owner, ...users] = await ethers.getSigners();
      const witchListAddresses = users.slice(0, 10).map((u: any) => u.address);
      const [root, tree] = generateMerkleTree(witchListAddresses);
      merkleTree = tree;
      await TestUtils.setWitchListMerkleRoot(contract, root);
    });

    it("mints correctly when witch sale is active", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, user] = await ethers.getSigners();

      // Grab current eth balance on the contract
      const currentEthBalance = await contract.provider.getBalance(
        contract.address
      );

      // Execute transaction for given user to mint a witch
      await TestUtils.mintWitchSale(
        contract,
        user,
        merkleTree[user.address] ?? []
      );

      // Assert the new eth balance in the contract reflects the amount
      // of eth transfered, and that ownership of the token is reflected.
      const newEthBalance = await contract.provider.getBalance(
        contract.address
      );
      const expectedTokenId = "1";
      const userCovenBalance = await contract.balanceOf(user.address);
      expect(
        newEthBalance.eq(
          currentEthBalance.add(ethers.utils.parseEther(WITCH_SALE_PRICE_ETH))
        )
      ).to.be.true;
      expect(userCovenBalance.eq(1)).to.be.true;
      expect(await contract.ownerOf(expectedTokenId)).to.equal(user.address);
    });

    it("doesn't mint if witch sale is not active", async () => {
      const [_owner, user] = await ethers.getSigners();
      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? []
        );
        expect.fail(
          "Minting witch sale should fail user doesn't belong to witch list"
        );
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }
    });

    it("doesn't mint if user doesn't belong to witch list", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, ...users] = await ethers.getSigners();
      const user = users[users.length - 1];
      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          0
        );
        expect.fail("Minting witch sale should fail if it's not active");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }
    });

    it("doesn't mint if number requested is 0", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, user] = await ethers.getSigners();
      await TestUtils.mintWitchSale(
        contract,
        user,
        merkleTree[user.address] ?? [],
        0
      );
      expect((await contract.totalSupply()).toNumber()).to.equal(0);
    });

    it("doesn't mint if number requested would exceed limit per wallet", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, user] = await ethers.getSigners();

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          4
        );
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }

      await TestUtils.mintWitchSale(
        contract,
        user,
        merkleTree[user.address] ?? [],
        3
      );
      expect((await contract.totalSupply()).toNumber()).to.equal(3);

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          1
        );
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(3);
      }
    });

    it("doesn't mint if number requested would exceed max allocation of cats for witch sale", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, user, ...users] = await ethers.getSigners();
      // Mint 3 tokens first
      for (let user of users.slice(0, 3)) {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          1
        );
      }
      expect((await contract.totalSupply()).toNumber()).to.equal(3);

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          2
        );
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(3);
      }

      await TestUtils.mintWitchSale(
        contract,
        user,
        merkleTree[user.address] ?? [],
        1
      );
      expect((await contract.totalSupply()).toNumber()).to.equal(4);

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          1
        );
        expect.fail("Minting over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(4);
      }
    });

    it("doesn't mint if eth value sent is insufficient", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.WITCH);
      const [_owner, user] = await ethers.getSigners();
      expect((await contract.totalSupply()).toNumber()).to.equal(0);

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          1,
          "0.04"
        );
        expect.fail("Minting without sending enough eth should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }

      try {
        await TestUtils.mintWitchSale(
          contract,
          user,
          merkleTree[user.address] ?? [],
          1,
          "0.04"
        );
        expect.fail("Minting without sending enough eth should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }
    });
  });

  describe("gifting", () => {
    it("can reserve cats correctly", async () => {
      const [owner] = await ethers.getSigners();
      await TestUtils.reserveForGifting(contract, 2);
      expect((await contract.totalSupply()).toNumber()).to.equal(2);

      expect(await contract.ownerOf("1")).to.equal(owner.address);
      expect(await contract.ownerOf("2")).to.equal(owner.address);

      await TestUtils.reserveForGifting(contract, 1);
      expect((await contract.totalSupply()).toNumber()).to.equal(3);

      expect(await contract.ownerOf("3")).to.equal(owner.address);
    });

    it("doesn't reserve if number requested would exceed max allocation of witches to gift", async () => {
      try {
        await TestUtils.reserveForGifting(contract, 20);
        expect.fail("Reserving over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(0);
      }

      // Reserving under limit should succeed
      await TestUtils.reserveForGifting(contract, 2);
      expect((await contract.totalSupply()).toNumber()).to.equal(2);

      try {
        await TestUtils.reserveForGifting(contract, 2);
        expect.fail("Reserving over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(2);
      }
    });

    it("can gift cats correctly", async () => {
      const [_owner, user1, user2] = await ethers.getSigners();

      await TestUtils.giftCats(contract, [user1, user2]);
      expect((await contract.totalSupply()).toNumber()).to.equal(2);
      expect(await contract.ownerOf("1")).to.equal(user1.address);
      expect(await contract.ownerOf("2")).to.equal(user2.address);
    });

    it("minting then gifting works", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user1, user2] = await ethers.getSigners();
      await TestUtils.mintPublicSale(contract, user1);
      expect((await contract.totalSupply()).toNumber()).to.equal(1);
      expect(await contract.ownerOf("1")).to.equal(user1.address);

      await TestUtils.giftCats(contract, [user1, user2]);
      expect((await contract.totalSupply()).toNumber()).to.equal(3);
      expect(await contract.ownerOf("2")).to.equal(user1.address);
      expect(await contract.ownerOf("3")).to.equal(user2.address);
    });

    it("doesn't gift if number requested would exceed max allocation of cats to gift", async () => {
      // Reserve full supply of gifting
      await TestUtils.reserveForGifting(contract, 3);
      expect((await contract.totalSupply()).toNumber()).to.equal(3);

      const [_owner, user1, user2] = await ethers.getSigners();
      try {
        await TestUtils.giftCats(contract, [user1, user2]);
        expect.fail("Reserving over limit should fail");
      } catch (err: any) {
        if (err.toString().includes("AssertionError")) {
          throw err;
        }
        expect((await contract.totalSupply()).toNumber()).to.equal(3);
      }
    });
  });

  describe("royaltyInfo", () => {
    it("provides royalty info as per IERC165 spec", async () => {
      // Activate sale
      await TestUtils.setSalePhase(contract, SalePhase.PUBLIC);
      const [_owner, user] = await ethers.getSigners();

      // Execute transaction for given user to mint a witch
      await TestUtils.mintPublicSale(contract, user);

      let royaltyInfo;
      const expectedTokenId = "1";

      royaltyInfo = await TestUtils.getRoyaltyInfo(
        contract,
        expectedTokenId,
        PUBLIC_SALE_PRICE_ETH
      );
      // Assert contract is recipient of royalties
      expect(royaltyInfo[0]).to.equal(contract.address);
      // Assert sale price is calculated correctly (5% of sale price)
      expect(
        royaltyInfo[1].eq(
          ethers.utils.parseEther("0.0035") // 5% of 0.07eth
        )
      ).to.be.true;

      // Assert correct royalty info on a hypothetical future sale
      royaltyInfo = await TestUtils.getRoyaltyInfo(
        contract,
        expectedTokenId,
        "10" // eth
      );
      expect(royaltyInfo[0]).to.equal(contract.address);
      expect(
        royaltyInfo[1].eq(
          ethers.utils.parseEther("0.5") // 5% of 10eth
        )
      ).to.be.true;
    });
  });

  describe("withdraw", () => {
    it("owner can withdraw ether correctly", async () => {
      const [owner, ...users] = await ethers.getSigners();
      await contract.setSalePhase(SalePhase.PUBLIC);

      const startingBalance = await owner.getBalance();
      expect(await contract.provider.getBalance(contract.address)).to.equal(
        ethers.BigNumber.from(0)
      );

      // Mint the whole supply
      for (let user of users.slice(0, 7)) {
        await TestUtils.mintPublicSale(contract, user);
      }

      expect(await owner.getBalance()).to.equal(startingBalance);
      expect(await contract.provider.getBalance(contract.address)).to.equal(
        ethers.utils.parseEther("0.49")
      );

      const receipt = await TestUtils.withdraw(contract);

      const endingBalance = await owner.getBalance();
      expect(endingBalance).to.equal(
        startingBalance
          .add(ethers.utils.parseEther("0.49"))
          .sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice))
      );
      expect(await contract.provider.getBalance(contract.address)).to.equal(
        ethers.BigNumber.from(0)
      );
    });
  });
});
