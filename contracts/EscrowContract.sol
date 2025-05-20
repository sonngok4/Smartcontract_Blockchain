// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LandRegistry.sol";

contract EscrowContract is Ownable, ReentrancyGuard {
    // Tham chiếu đến hợp đồng LandRegistry
    LandRegistry public landRegistry;

    enum EscrowState {
        Created, // Đã tạo đặt cọc
        Confirmed, // Chủ đất đã xác nhận
        Completed, // Đã hoàn thành
        Cancelled, // Đã hủy
        Refunded, // Đã hoàn tiền
        Disputed, // Đang tranh chấp
        Resolved // Đã giải quyết tranh chấp
    }

    struct Escrow {
        uint256 landId;
        address buyer;
        address seller;
        uint256 amount;
        uint256 createdAt;
        uint256 completedAt;
        uint256 deadline; // Hạn chót của đặt cọc (tính bằng timestamp)
        string agreementHash; // IPFS hash của hợp đồng đặt cọc
        string contactInfo; // Thông tin liên hệ đã được mã hóa
        EscrowState state;
        string cancelReason; // Lý do hủy đặt cọc
        string disputeReason; // Lý do tranh chấp
        address disputeRaisedBy; // Người tạo tranh chấp
        uint256 disputeRaisedAt; // Thời điểm tạo tranh chấp
        bool isPartialRefund; // Có phải hoàn tiền một phần không
        uint256 refundAmount; // Số tiền hoàn trả
    }

    mapping(uint256 => Escrow) public escrows;
    uint256 private escrowCount = 0;

    // Biến lưu trữ phần trăm phí của nền tảng (1% = 100)
    uint256 public platformFeePercent = 100; // Mặc định 1%
    address public feeCollector;

    // Mapping để lưu trữ các escrow của một người dùng
    mapping(address => uint256[]) public userEscrows;

    // Thêm mapping để lưu trữ lịch sử trạng thái
    mapping(uint256 => EscrowState[]) public escrowStateHistory;
    mapping(uint256 => uint256[]) public escrowStateTimestamps;

    // Events
    event EscrowCreated(
        uint256 escrowId,
        uint256 landId,
        address buyer,
        address seller,
        uint256 amount
    );
    event EscrowConfirmed(uint256 escrowId, address seller);
    event EscrowCompleted(uint256 escrowId);
    event EscrowCancelled(uint256 escrowId, string reason);
    event EscrowRefunded(uint256 escrowId);
    event AgreementUpdated(uint256 escrowId, string agreementHash);
    event EscrowStateChanged(uint256 escrowId, EscrowState oldState, EscrowState newState);
    event DisputeRaised(uint256 escrowId, address raisedBy, string reason);
    event DisputeResolved(uint256 escrowId, address resolver, string resolution);
    event PartialRefundIssued(uint256 escrowId, uint256 amount, string reason);

    constructor(address _landRegistryAddress, address _feeCollector) {
        landRegistry = LandRegistry(_landRegistryAddress);
        feeCollector = _feeCollector;
    }

    // Cập nhật phí nền tảng - chỉ chủ sở hữu hợp đồng
    function updatePlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 500, "Fee too high"); // Tối đa 5%
        platformFeePercent = _feePercent;
    }

    // Cập nhật địa chỉ nhận phí
    function updateFeeCollector(address _feeCollector) external onlyOwner {
        feeCollector = _feeCollector;
    }

    // Tạo đặt cọc mới
    function createEscrow(
        uint256 _landId,
        uint256 _durationDays,
        string memory _contactInfo,
        string memory _agreementHash
    ) external payable nonReentrant returns (uint256) {
        // Kiểm tra bất động sản
        require(_landId > 0, "Invalid land ID");

        // Lấy thông tin về bất động sản
        LandRegistry.Land memory land = landRegistry.getLandDetails(_landId);
        address seller = land.owner;

        // Kiểm tra người mua không phải là chủ đất
        require(msg.sender != seller, "Cannot create escrow for your own land");

        // Kiểm tra số tiền đặt cọc
        require(msg.value > 0, "Must send ether for escrow");

        // Tạo escrow mới
        escrowCount++;
        uint256 newEscrowId = escrowCount;
        uint256 deadline = block.timestamp + (_durationDays * 1 days);

        escrows[newEscrowId] = Escrow({
            landId: _landId,
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            createdAt: block.timestamp,
            completedAt: 0,
            deadline: deadline,
            agreementHash: _agreementHash,
            contactInfo: _contactInfo,
            state: EscrowState.Created,
            cancelReason: "",
            disputeReason: "",
            disputeRaisedBy: address(0),
            disputeRaisedAt: 0,
            isPartialRefund: false,
            refundAmount: 0
        });

        // Lưu escrow vào danh sách của người dùng
        userEscrows[msg.sender].push(newEscrowId);
        userEscrows[seller].push(newEscrowId);

        emit EscrowCreated(newEscrowId, _landId, msg.sender, seller, msg.value);

        return newEscrowId;
    }

    // Chủ đất xác nhận đặt cọc
    function confirmEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];

        require(escrow.seller == msg.sender, "Only seller can confirm");
        require(
            escrow.state == EscrowState.Created,
            "Escrow not in Created state"
        );
        require(block.timestamp < escrow.deadline, "Escrow has expired");

        escrow.state = EscrowState.Confirmed;

        emit EscrowConfirmed(_escrowId, msg.sender);
    }

    // Hoàn thành đặt cọc - chỉ có thể gọi khi đã xác nhận
    function completeEscrow(uint256 _escrowId) external nonReentrant {
        Escrow storage escrow = escrows[_escrowId];

        require(escrow.state == EscrowState.Confirmed, "Escrow not confirmed");
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Not authorized"
        );

        // Tính phí nền tảng
        uint256 fee = (escrow.amount * platformFeePercent) / 10000;
        uint256 sellerAmount = escrow.amount - fee;

        // Chuyển tiền cho người bán
        payable(escrow.seller).transfer(sellerAmount);

        // Chuyển phí cho nền tảng
        if (fee > 0) {
            payable(feeCollector).transfer(fee);
        }

        // Cập nhật trạng thái
        escrow.state = EscrowState.Completed;
        escrow.completedAt = block.timestamp;

        emit EscrowCompleted(_escrowId);
    }

    // Hủy đặt cọc - có thể gọi bởi người mua hoặc người bán với các điều kiện khác nhau
    function cancelEscrow(uint256 _escrowId, string memory _reason) external {
        Escrow storage escrow = escrows[_escrowId];

        // Kiểm tra điều kiện hủy
        if (escrow.state == EscrowState.Created) {
            // Trước khi chủ đất xác nhận, người mua có thể hủy bất kỳ lúc nào
            require(
                msg.sender == escrow.buyer,
                "Only buyer can cancel at this stage"
            );
        } else if (escrow.state == EscrowState.Confirmed) {
            // Sau khi xác nhận, cần sự đồng thuận của cả hai bên hoặc đã quá hạn
            require(
                msg.sender == escrow.buyer ||
                    msg.sender == escrow.seller ||
                    block.timestamp > escrow.deadline,
                "Not authorized or not expired"
            );
        } else {
            revert("Cannot cancel at current state");
        }

        escrow.state = EscrowState.Cancelled;
        escrow.cancelReason = _reason;

        emit EscrowCancelled(_escrowId, _reason);

        // Tự động hoàn tiền khi hủy
        refundEscrow(_escrowId);
    }

    // Hoàn tiền đặt cọc cho người mua
    function refundEscrow(uint256 _escrowId) public nonReentrant {
        Escrow storage escrow = escrows[_escrowId];

        require(escrow.state == EscrowState.Cancelled, "Escrow not cancelled");
        require(escrow.state != EscrowState.Refunded, "Already refunded");

        // Hoàn tiền cho người mua
        payable(escrow.buyer).transfer(escrow.amount);
        escrow.state = EscrowState.Refunded;

        emit EscrowRefunded(_escrowId);
    }

    // Cập nhật hợp đồng đặt cọc
    function updateAgreement(
        uint256 _escrowId,
        string memory _newAgreementHash
    ) external {
        Escrow storage escrow = escrows[_escrowId];

        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Not authorized"
        );
        require(
            escrow.state == EscrowState.Created ||
                escrow.state == EscrowState.Confirmed,
            "Cannot update at current state"
        );

        escrow.agreementHash = _newAgreementHash;

        emit AgreementUpdated(_escrowId, _newAgreementHash);
    }

    // Lấy danh sách escrow của một người dùng
    function getUserEscrows(
        address _user
    ) external view returns (uint256[] memory) {
        return userEscrows[_user];
    }

    // Lấy thông tin chi tiết của một escrow
    function getEscrowDetails(
        uint256 _escrowId
    )
        external
        view
        returns (
            uint256 landId,
            address buyer,
            address seller,
            uint256 amount,
            uint256 createdAt,
            uint256 completedAt,
            uint256 deadline,
            string memory agreementHash,
            string memory contactInfo,
            EscrowState state,
            string memory cancelReason
        )
    {
        Escrow memory escrow = escrows[_escrowId];
        return (
            escrow.landId,
            escrow.buyer,
            escrow.seller,
            escrow.amount,
            escrow.createdAt,
            escrow.completedAt,
            escrow.deadline,
            escrow.agreementHash,
            escrow.contactInfo,
            escrow.state,
            escrow.cancelReason
        );
    }

    // Kiểm tra xem một escrow có quá hạn không
    function isEscrowExpired(uint256 _escrowId) external view returns (bool) {
        return block.timestamp > escrows[_escrowId].deadline;
    }

    // Thêm hàm để tạo tranh chấp
    function raiseDispute(uint256 _escrowId, string memory _reason) external {
        Escrow storage escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can raise dispute"
        );
        require(
            escrow.state == EscrowState.Confirmed,
            "Can only raise dispute in Confirmed state"
        );

        escrow.state = EscrowState.Disputed;
        escrow.disputeReason = _reason;
        escrow.disputeRaisedBy = msg.sender;
        escrow.disputeRaisedAt = block.timestamp;

        // Cập nhật lịch sử trạng thái
        escrowStateHistory[_escrowId].push(EscrowState.Disputed);
        escrowStateTimestamps[_escrowId].push(block.timestamp);

        emit DisputeRaised(_escrowId, msg.sender, _reason);
    }

    // Thêm hàm để giải quyết tranh chấp
    function resolveDispute(
        uint256 _escrowId,
        bool _refundToBuyer,
        string memory _resolution
    ) external onlyOwner {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.state == EscrowState.Disputed, "Escrow not in disputed state");

        if (_refundToBuyer) {
            // Hoàn tiền cho người mua
            payable(escrow.buyer).transfer(escrow.amount);
            escrow.state = EscrowState.Refunded;
        } else {
            // Chuyển tiền cho người bán
            payable(escrow.seller).transfer(escrow.amount);
            escrow.state = EscrowState.Completed;
        }

        // Cập nhật lịch sử trạng thái
        escrowStateHistory[_escrowId].push(escrow.state);
        escrowStateTimestamps[_escrowId].push(block.timestamp);

        emit DisputeResolved(_escrowId, msg.sender, _resolution);
    }

    // Thêm hàm để hoàn tiền một phần
    function issuePartialRefund(
        uint256 _escrowId,
        uint256 _amount,
        string memory _reason
    ) external {
        Escrow storage escrow = escrows[_escrowId];
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can issue partial refund"
        );
        require(_amount <= escrow.amount, "Refund amount exceeds escrow amount");

        escrow.isPartialRefund = true;
        escrow.refundAmount = _amount;
        payable(escrow.buyer).transfer(_amount);

        // Cập nhật lịch sử trạng thái
        escrowStateHistory[_escrowId].push(escrow.state);
        escrowStateTimestamps[_escrowId].push(block.timestamp);

        emit PartialRefundIssued(_escrowId, _amount, _reason);
    }

    // Thêm hàm để lấy lịch sử trạng thái
    function getEscrowStateHistory(uint256 _escrowId)
        external
        view
        returns (EscrowState[] memory states, uint256[] memory timestamps)
    {
        return (escrowStateHistory[_escrowId], escrowStateTimestamps[_escrowId]);
    }
}
