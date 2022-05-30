//SPDX-License-Identifier: MIT
//Contract based on [https://docs.openzeppelin.com/contracts/3.x/erc721](https://docs.openzeppelin.com/contracts/3.x/erc721)

pragma solidity ^0.8.4;

import "erc721a-upgradeable/contracts/ERC721AUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract CovenCats is ERC721AUpgradeable, IERC2981, Ownable, ReentrancyGuard {
    using Strings for uint256;

    string private baseURI;
    string public verificationHash;
    address private openSeaProxyRegistryAddress;
    bool private isOpenSeaProxyActive = true;

    uint256 public constant MAX_CATS_PER_PHASE = 3;
    uint256 public MAX_CATS = 9999;
    uint256 public MAX_GIFTED_CATS = 666;
    uint256 public numGiftedCats;

    enum SalePhase {
        PUBLIC,
        MEOWLIST,
        WITCH,
        OFF
    }
    SalePhase public salePhase = SalePhase.OFF;

    uint256 public constant PUBLIC_SALE_PRICE = 0.07 ether;

    bytes32 public meowlistSaleMerkleRoot;

    uint256 public constant WITCH_SALE_PRICE = 0.05 ether;
    bytes32 public witchSaleMerkleRoot;

    mapping(string => uint256) public mintCounts;

    // ============ ACCESS CONTROL/SANITY MODIFIERS ============

    modifier publicSaleActive() {
        require(salePhase == SalePhase.PUBLIC, "Public sale is not open");
        _;
    }

    modifier meowlistSaleActive() {
        require(salePhase == SalePhase.MEOWLIST, "MEOWLIST sale is not open");
        _;
    }

    modifier witchSaleActive() {
        require(salePhase == SalePhase.WITCH, "WITCH sale is not open");
        _;
    }

    modifier maxCatsPerPhase(uint256 numberOfTokens) {
        require(
            mintCounts[mintCountsIdentifier()] + numberOfTokens <=
                MAX_CATS_PER_PHASE,
            "Max cats to mint per phase is three"
        );
        _;
    }

    modifier canMintCats(uint256 numberOfTokens) {
        require(
            totalSupply() + numberOfTokens <=
                MAX_CATS - MAX_GIFTED_CATS + numGiftedCats,
            "Not enough cats remaining to mint"
        );
        _;
    }

    modifier canGiftCats(uint256 num) {
        require(
            numGiftedCats + num <= MAX_GIFTED_CATS,
            "Not enough cats remaining to gift"
        );
        require(
            totalSupply() + num <= MAX_CATS,
            "Not enough cats remaining to mint"
        );
        _;
    }

    modifier isCorrectPayment(uint256 price, uint256 numberOfTokens) {
        require(
            price * numberOfTokens == msg.value,
            "Incorrect ETH value sent"
        );
        _;
    }

    modifier isValidMerkleProof(bytes32[] calldata merkleProof, bytes32 root) {
        require(
            MerkleProof.verify(
                merkleProof,
                root,
                keccak256(abi.encodePacked(msg.sender))
            ),
            "Address does not exist in list"
        );
        _;
    }

    function initialize() public initializerERC721A {
        __ERC721A_init("Coven Cats", "CAT");
    }

    // ============ PUBLIC FUNCTIONS FOR MINTING ============

    function mint(uint256 numberOfTokens)
        external
        payable
        nonReentrant
        isCorrectPayment(PUBLIC_SALE_PRICE, numberOfTokens)
        publicSaleActive
        canMintCats(numberOfTokens)
        maxCatsPerPhase(numberOfTokens)
    {
        mintCounts[mintCountsIdentifier()] += numberOfTokens;
        _safeMint(msg.sender, numberOfTokens);
    }

    function mintMeowlistSale(
        uint8 numberOfTokens,
        bytes32[] calldata merkleProof
    )
        external
        payable
        nonReentrant
        meowlistSaleActive
        canMintCats(numberOfTokens)
        maxCatsPerPhase(numberOfTokens)
        isCorrectPayment(PUBLIC_SALE_PRICE, numberOfTokens)
        isValidMerkleProof(merkleProof, meowlistSaleMerkleRoot)
    {
        mintCounts[mintCountsIdentifier()] += numberOfTokens;
        _safeMint(msg.sender, numberOfTokens);
    }

    function mintWitchSale(uint8 numberOfTokens, bytes32[] calldata merkleProof)
        external
        payable
        nonReentrant
        witchSaleActive
        canMintCats(numberOfTokens)
        maxCatsPerPhase(numberOfTokens)
        isCorrectPayment(WITCH_SALE_PRICE, numberOfTokens)
        isValidMerkleProof(merkleProof, witchSaleMerkleRoot)
    {
        mintCounts[mintCountsIdentifier()] += numberOfTokens;
        _safeMint(msg.sender, numberOfTokens);
    }

    // ============ PUBLIC READ-ONLY FUNCTIONS ============

    function getBaseURI() external view returns (string memory) {
        return baseURI;
    }

    // ============ OWNER-ONLY ADMIN FUNCTIONS ============

    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    // function to disable gasless listings for security in case
    // opensea ever shuts down or is compromised
    function setIsOpenSeaProxyActive(bool _isOpenSeaProxyActive)
        external
        onlyOwner
    {
        isOpenSeaProxyActive = _isOpenSeaProxyActive;
    }

    function setVerificationHash(string memory _verificationHash)
        external
        onlyOwner
    {
        verificationHash = _verificationHash;
    }

    function setSalePhase(SalePhase newPhase) external onlyOwner {
        salePhase = newPhase;
    }

    function setMeowlistMerkleRoot(bytes32 merkleRoot) external onlyOwner {
        meowlistSaleMerkleRoot = merkleRoot;
    }

    function setWitchListMerkleRoot(bytes32 merkleRoot) external onlyOwner {
        witchSaleMerkleRoot = merkleRoot;
    }

    function reserveForGifting(uint256 numToReserve)
        external
        nonReentrant
        onlyOwner
        canGiftCats(numToReserve)
    {
        numGiftedCats += numToReserve;
        _safeMint(msg.sender, numToReserve);
    }

    function giftCats(address[] calldata addresses)
        external
        nonReentrant
        onlyOwner
        canGiftCats(addresses.length)
    {
        uint256 numToGift = addresses.length;
        numGiftedCats += numToGift;

        for (uint256 i = 0; i < numToGift; i++) {
            _safeMint(addresses[i], 1);
        }
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function withdrawTokens(IERC20 token) public onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }

    // ============ SUPPORTING FUNCTIONS ============

    function mintCountsIdentifier() private view returns (string memory) {
        return string(abi.encodePacked(msg.sender, "-", salePhase));
    }

    // ============ FUNCTION OVERRIDES ============

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721AUpgradeable, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Override isApprovedForAll to allowlist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        // Get a reference to OpenSea's proxy registry contract by instantiating
        // the contract using the already existing address.
        ProxyRegistry proxyRegistry = ProxyRegistry(
            openSeaProxyRegistryAddress
        );
        if (
            isOpenSeaProxyActive &&
            address(proxyRegistry.proxies(owner)) == operator
        ) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }
    /**
     * @dev See {ERC721AUpgradeable-_startTokenId}
     */
     function _startTokenId() internal view virtual override returns (uint256){
         return 1;
     }
    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Nonexistent token");

        return
            string(abi.encodePacked(baseURI, "/", tokenId.toString(), ".json"));
    }

    /**
     * @dev See {IERC165-royaltyInfo}.
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        require(_exists(tokenId), "Nonexistent token");

        return (address(this), SafeMath.div(SafeMath.mul(salePrice, 75), 1000));
    }

    receive() external payable {}
}

// These contract definitions are used to create a reference to the OpenSea
// ProxyRegistry contract by using the registry's address (see isApprovedForAll).
contract OwnableDelegateProxy {

}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
