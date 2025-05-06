// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandRegistry is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Cấu trúc dữ liệu cho một bất động sản
    struct Land {
        uint256 id;
        string location;
        uint256 area; // diện tích tính bằng mét vuông
        address owner;
        uint256 price;
        bool forSale;
        string documentHash; // IPFS hash của giấy tờ liên quan
    }

    // Lưu trữ thông tin các bất động sản
    mapping(uint256 => Land) public lands;
    
    // Lưu trữ lịch sử giao dịch của bất động sản
    struct Transaction {
        address from;
        address to;
        uint256 price;
        uint256 timestamp;
    }
    
    // Ánh xạ từ tokenId sang lịch sử giao dịch
    mapping(uint256 => Transaction[]) public transactionHistory;
    
    // Sự kiện
    event LandRegistered(uint256 indexed tokenId, string location, address owner);
    event LandTransferred(uint256 indexed tokenId, address from, address to, uint256 price);
    event LandPriceChanged(uint256 indexed tokenId, uint256 newPrice);
    event LandForSale(uint256 indexed tokenId, bool isForSale);
    
    // Chỉ chủ sở hữu hiện tại của đất
    modifier onlyLandOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner of this land");
        _;
    }
    
    constructor() ERC721("LandRegistry", "LAND") {}
    
    // Đăng ký bất động sản mới
    function registerLand(
        string memory location,
        uint256 area,
        string memory documentHash,
        string memory tokenURI
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        lands[newTokenId] = Land(
            newTokenId,
            location,
            area,
            msg.sender,
            0,
            false,
            documentHash
        );
        
        // Ghi nhận giao dịch đầu tiên (đăng ký)
        Transaction memory newTransaction = Transaction(
            address(0),
            msg.sender,
            0,
            block.timestamp
        );
        transactionHistory[newTokenId].push(newTransaction);
        
        emit LandRegistered(newTokenId, location, msg.sender);
        
        return newTokenId;
    }
    
    // Cập nhật giá bất động sản
    function updateLandPrice(uint256 tokenId, uint256 price) public onlyLandOwner(tokenId) {
        lands[tokenId].price = price;
        emit LandPriceChanged(tokenId, price);
    }
    
    // Đặt/hủy trạng thái bán
    function setForSale(uint256 tokenId, bool isForSale) public onlyLandOwner(tokenId) {
        require(lands[tokenId].price > 0 || !isForSale, "Price must be set before listing for sale");
        lands[tokenId].forSale = isForSale;
        emit LandForSale(tokenId, isForSale);
    }
    
    // Mua bất động sản
    function buyLand(uint256 tokenId) public payable {
        require(lands[tokenId].forSale, "Land is not for sale");
        require(msg.value >= lands[tokenId].price, "Insufficient payment");
        
        address seller = ownerOf(tokenId);
        
        // Thực hiện giao dịch
        payable(seller).transfer(msg.value);
        
        // Cập nhật lịch sử giao dịch
        Transaction memory newTransaction = Transaction(
            seller,
            msg.sender,
            msg.value,
            block.timestamp
        );
        transactionHistory[tokenId].push(newTransaction);
        
        // Chuyển nhượng NFT
        _transfer(seller, msg.sender, tokenId);
        
        // Cập nhật thông tin bất động sản
        lands[tokenId].owner = msg.sender;
        lands[tokenId].forSale = false;
        
        emit LandTransferred(tokenId, seller, msg.sender, msg.value);
    }
    
    // Lấy lịch sử giao dịch của bất động sản
    function getTransactionHistory(uint256 tokenId) public view returns (Transaction[] memory) {
        return transactionHistory[tokenId];
    }
    
    // Lấy thông tin chi tiết của bất động sản
    function getLandDetails(uint256 tokenId) public view returns (Land memory) {
        require(_exists(tokenId), "Land does not exist");
        return lands[tokenId];
    }
    
    // Lấy tất cả bất động sản của một người dùng
    function getLandsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 landCount = 0;
        uint256 totalLands = _tokenIds.current();
        
        // Đếm số lượng đất thuộc sở hữu của owner
        for (uint256 i = 1; i <= totalLands; i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                landCount++;
            }
        }
        
        // Tạo mảng kết quả
        uint256[] memory result = new uint256[](landCount);
        uint256 index = 0;
        
        // Lọc ra các mảnh đất thuộc sở hữu của owner
        for (uint256 i = 1; i <= totalLands; i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                result[index] = i;
                index++;
            }
        }
        
        return result;
    }
}