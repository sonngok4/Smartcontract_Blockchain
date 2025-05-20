import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadFileToIPFS } from '../utils/ipfsService.js';
import './CreateDepositAgreement.css';

function CreateDepositAgreement({ web3, contract, escrowContract, accounts }) {
    const { id } = useParams(); // ID của bất động sản
    const navigate = useNavigate();

    const [land, setLand] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositDuration, setDepositDuration] = useState(30); // Mặc định 30 ngày
    const [contactInfo, setContactInfo] = useState('');
    const [agreementPreview, setAgreementPreview] = useState(null);
    const [error, setError] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [partialRefundAmount, setPartialRefundAmount] = useState('');
    const [showPartialRefundForm, setShowPartialRefundForm] = useState(false);
    const [escrowId, setEscrowId] = useState(null);
    const [escrow, setEscrow] = useState(null);

    useEffect(() => {
        const fetchLandDetails = async () => {
            if (!contract || !accounts || accounts.length === 0) {
                setError("Vui lòng kết nối ví MetaMask");
                setLoading(false);
                return;
            }

            try {
                // Lấy thông tin chi tiết của bất động sản
                const landDetails = await contract.methods.getLandDetails(id).call();

                // Kiểm tra xem bất động sản có đang bán không
                if (!landDetails.forSale) {
                    setError("Bất động sản này không được rao bán");
                    setLoading(false);
                    return;
                }

                // Kiểm tra xem người dùng hiện tại có phải là chủ sở hữu không
                if (accounts[0].toLowerCase() === landDetails.owner.toLowerCase()) {
                    setError("Bạn không thể đặt cọc bất động sản của chính mình");
                    setLoading(false);
                    return;
                }

                // Lấy metadata từ IPFS
                let metadata = null;
                try {
                    const tokenURI = await contract.methods.tokenURI(id).call();
                    if (tokenURI) {
                        const ipfsHash = tokenURI.replace('ipfs://', '');
                        const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
                        metadata = await response.json();
                    }
                } catch (err) {
                    console.error('Error fetching metadata:', err);
                }

                setLand({
                    ...landDetails,
                    metadata,
                    id
                });

                // Thiết lập giá trị đặt cọc mặc định (30% giá trị bất động sản)
                const price = web3.utils.fromWei(landDetails.price, 'ether');
                setDepositAmount((parseFloat(price) * 0.3).toFixed(4));

                setLoading(false);
            } catch (err) {
                console.error('Error fetching land details:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchLandDetails();
    }, [contract, accounts, id, web3]);

    // Thêm useEffect để theo dõi trạng thái escrow
    useEffect(() => {
        const fetchEscrowDetails = async () => {
            if (escrowId && escrowContract) {
                try {
                    const escrowDetails = await escrowContract.methods.getEscrowDetails(escrowId).call();
                    setEscrow(escrowDetails);
                } catch (err) {
                    console.error('Error fetching escrow details:', err);
                }
            }
        };

        fetchEscrowDetails();
    }, [escrowId, escrowContract]);

    const generateAgreement = () => {
        setGenerating(true);
        toast.loading('Đang tạo hợp đồng...');

        // Lấy ngày hiện tại
        const today = new Date();
        const formattedDate = today.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Format giá tiền
        const depositAmountText = parseFloat(depositAmount).toLocaleString('vi-VN');
        const landPriceText = parseFloat(web3.utils.fromWei(land.price, 'ether')).toLocaleString('vi-VN');

        // Tính ngày hết hạn
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + parseInt(depositDuration));
        const formattedExpiryDate = expiryDate.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Tạo nội dung hợp đồng đặt cọc
        const agreementContent = `
    <div class="deposit-agreement-preview">
      <h1>HỢP ĐỒNG ĐẶT CỌC QUYỀN MUA BẤT ĐỘNG SẢN</h1>
      
      <p>Hôm nay, ngày ${formattedDate}, chúng tôi gồm:</p>
      
      <h2>BÊN BÁN (Bên A):</h2>
      <p>Địa chỉ ví: ${land.owner}</p>
      
      <h2>BÊN MUA (Bên B):</h2>
      <p>Địa chỉ ví: ${accounts[0]}</p>
      <p>Thông tin liên hệ: ${contactInfo}</p>
      
      <h2>SAU KHI BÀN BẠC, THỎA THUẬN, HAI BÊN THỐNG NHẤT KÝ KẾT HỢP ĐỒNG ĐẶT CỌC VỚI CÁC ĐIỀU KHOẢN SAU:</h2>
      
      <h3>ĐIỀU 1: TÀI SẢN ĐẶT CỌC</h3>
      <p>1.1. Bên B đồng ý đặt cọc cho Bên A để đảm bảo việc mua bất động sản với các thông tin như sau:</p>
      <p>- Mã bất động sản: #${land.id}</p>
      <p>- Vị trí: ${land.location}</p>
      <p>- Diện tích: ${land.area} m²</p>
      
      <h3>ĐIỀU 2: SỐ TIỀN ĐẶT CỌC</h3>
      <p>2.1. Số tiền đặt cọc: ${depositAmountText} ETH (bằng chữ: .....)</p>
      <p>2.2. Số tiền đặt cọc này tương đương với ${Math.round(parseFloat(depositAmount) / parseFloat(web3.utils.fromWei(land.price, 'ether')) * 100)}% giá trị bất động sản.</p>
      <p>2.3. Giá trị của bất động sản: ${landPriceText} ETH</p>
      <p>2.4. Số tiền đặt cọc sẽ được chuyển qua smart contract và được quản lý bởi hệ thống blockchain.</p>
      
      <h3>ĐIỀU 3: THỜI HẠN VÀ PHƯƠNG THỨC GIAO DỊCH</h3>
      <p>3.1. Thời hạn hiệu lực của hợp đồng đặt cọc: ${depositDuration} ngày kể từ ngày ký hợp đồng đặt cọc.</p>
      <p>3.2. Hạn chót để hoàn tất giao dịch: ${formattedExpiryDate}</p>
      <p>3.3. Trong thời hạn hiệu lực của hợp đồng đặt cọc, hai bên sẽ tiến hành các thủ tục pháp lý cần thiết để hoàn tất việc chuyển nhượng bất động sản theo quy định của pháp luật hiện hành.</p>
      
      <h3>ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</h3>
      <p>4.1. Có nghĩa vụ bảo quản, giữ gìn tài sản đặt cọc.</p>
      <p>4.2. Không được phép bán, chuyển nhượng, thế chấp bất động sản nói trên cho bên thứ ba trong thời gian có hiệu lực của hợp đồng đặt cọc.</p>
      <p>4.3. Cung cấp đầy đủ hồ sơ pháp lý liên quan đến bất động sản cho Bên B.</p>
      <p>4.4. Nếu từ chối giao dịch trong thời hạn hiệu lực của hợp đồng đặt cọc mà không có lý do chính đáng, Bên A phải hoàn trả số tiền đặt cọc và bồi thường thêm một khoản tiền bằng số tiền đặt cọc cho Bên B.</p>
      
      <h3>ĐIỀU 5: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</h3>
      <p>5.1. Được quyền yêu cầu Bên A cung cấp các thông tin, tài liệu liên quan đến bất động sản.</p>
      <p>5.2. Nếu từ chối giao dịch trong thời hạn hiệu lực của hợp đồng đặt cọc mà không có lý do chính đáng, Bên B sẽ mất số tiền đặt cọc.</p>
      
      <h3>ĐIỀU 6: ĐIỀU KHOẢN CHUNG</h3>
      <p>6.1. Hai bên cam kết thực hiện đúng và đầy đủ các điều khoản đã ghi trong hợp đồng.</p>
      <p>6.2. Mọi sửa đổi, bổ sung hợp đồng phải được sự đồng ý của cả hai bên và được lập thành văn bản.</p>
      <p>6.3. Hợp đồng này được thực hiện trên nền tảng blockchain với sự hỗ trợ của smart contract và được bảo đảm tính minh bạch, an toàn và chính xác.</p>
      <p>6.4. Hợp đồng đặt cọc này được tạo thành 02 (hai) bản có giá trị pháp lý như nhau.</p>
      
      <div class="signature-section">
        <div class="signature-block">
          <h4>BÊN BÁN (BÊN A)</h4>
          <p>(Ký và ghi rõ họ tên)</p>
          <div class="signature-line"></div>
          <p>${land.owner.substring(0, 10)}...${land.owner.substring(land.owner.length - 10)}</p>
        </div>
        
        <div class="signature-block">
          <h4>BÊN MUA (BÊN B)</h4>
          <p>(Ký và ghi rõ họ tên)</p>
          <div class="signature-line"></div>
          <p>${accounts[0].substring(0, 10)}...${accounts[0].substring(accounts[0].length - 10)}</p>
        </div>
      </div>
    </div>
    `;

        setAgreementPreview(agreementContent);
        setGenerating(false);
        toast.dismiss();
        toast.success('Hợp đồng đã được tạo thành công');
    };

    const handleCreateEscrow = async () => {
        setLoading(true);
        toast.loading('Đang tạo hợp đồng đặt cọc...');

        try {
            // Chuyển đổi HTML thành Blob để tải lên IPFS
            const blob = new Blob([agreementPreview], { type: 'text/html' });
            const file = new File([blob], `deposit-agreement-land-${id}.html`, { type: 'text/html' });

            // Upload hợp đồng lên IPFS
            const agreementHash = await uploadFileToIPFS(file);

            // Chuyển đổi depositAmount từ ETH sang Wei
            const depositAmountWei = web3.utils.toWei(depositAmount.toString(), 'ether');

            // Ước tính gas cho giao dịch
            const gasEstimate = await escrowContract.methods
                .createEscrow(
                    id,
                    depositDuration,
                    contactInfo,
                    agreementHash
                )
                .estimateGas({
                    from: accounts[0],
                    value: depositAmountWei
                });

            // Thêm 20% đệm cho gas limit
            const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

            // Tạo escrow trên blockchain
            const result = await escrowContract.methods
                .createEscrow(
                    id,
                    depositDuration,
                    contactInfo,
                    agreementHash
                )
                .send({
                    from: accounts[0],
                    value: depositAmountWei,
                    gas: gasLimit
                });

            // Lấy ID của escrow vừa tạo
            const newEscrowId = result.events.EscrowCreated.returnValues.escrowId;
            setEscrowId(newEscrowId);
            toast.dismiss();
            toast.success('Hợp đồng đặt cọc đã được tạo thành công');

            // Chuyển hướng đến trang chi tiết escrow
            navigate(`/escrow/${newEscrowId}`);
        } catch (err) {
            console.error('Error creating escrow:', err);
            setError(`Có lỗi xảy ra: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Thêm hàm xử lý tranh chấp
    const handleRaiseDispute = async () => {
        try {
            await escrowContract.methods
                .raiseDispute(escrowId, disputeReason)
                .send({ from: accounts[0] });

            toast.success('Đã tạo tranh chấp thành công');
            setShowDisputeForm(false);
            setDisputeReason('');
        } catch (err) {
            console.error('Error raising dispute:', err);
            toast.error('Có lỗi khi tạo tranh chấp: ' + err.message);
        }
    };

    // Thêm hàm xử lý hoàn tiền một phần
    const handlePartialRefund = async () => {
        try {
            const refundAmountWei = web3.utils.toWei(partialRefundAmount, 'ether');
            await escrowContract.methods
                .issuePartialRefund(escrowId, refundAmountWei, 'Hoàn tiền một phần theo thỏa thuận')
                .send({ from: accounts[0] });

            toast.success('Đã hoàn tiền một phần thành công');
            setShowPartialRefundForm(false);
            setPartialRefundAmount('');
        } catch (err) {
            console.error('Error issuing partial refund:', err);
            toast.error('Có lỗi khi hoàn tiền: ' + err.message);
        }
    };

    if (loading) {
        return <div className="loading">Đang tải thông tin...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <h2>Không thể tạo đặt cọc</h2>
                <p className="error-message">{error}</p>
                <button className="back-btn" onClick={() => navigate(`/land/${id}`)}>Quay lại</button>
            </div>
        );
    }

    return (
        <div className="create-deposit-container">
            <h2>Tạo hợp đồng đặt cọc</h2>
            <div className="deposit-land-info">
                <div className="land-image">
                    {land.metadata && land.metadata.image ? (
                        <img
                            src={land.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                            alt={`Land ${id}`}
                        />
                    ) : (
                        <div className="image-placeholder">Không có hình ảnh</div>
                    )}
                </div>

                <div className="land-details">
                    <h3>{land.metadata?.name || `Bất động sản #${id}`}</h3>
                    <p><strong>Vị trí:</strong> {land.location}</p>
                    <p><strong>Diện tích:</strong> {land.area} m²</p>
                    <p><strong>Giá bán:</strong> {web3.utils.fromWei(land.price, 'ether')} ETH</p>
                    <p><strong>Chủ sở hữu:</strong> {land.owner.substring(0, 8)}...{land.owner.substring(land.owner.length - 8)}</p>
                </div>
            </div>

            <div className="deposit-form">
                <div className="form-group">
                    <label>Số tiền đặt cọc (ETH):</label>
                    <label>+Thêm 20% đệm cho gas limit</label>
                    <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Thời hạn đặt cọc (ngày):</label>
                    <input
                        type="number"
                        value={depositDuration}
                        onChange={(e) => setDepositDuration(e.target.value)}
                        min="1"
                        max="90"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Thông tin liên hệ (số điện thoại, email):</label>
                    <input
                        type="text"
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        required
                        placeholder="Nhập thông tin liên hệ của bạn"
                    />
                </div>

                <button
                    className="generate-btn"
                    onClick={generateAgreement}
                    disabled={!depositAmount || !depositDuration || !contactInfo || generating}
                >
                    {generating ? 'Đang tạo...' : 'Tạo hợp đồng đặt cọc'}
                </button>
            </div>

            {agreementPreview && (
                <>
                    <div className="agreement-preview" dangerouslySetInnerHTML={{ __html: agreementPreview }}></div>

                    <div className="actions">
                        <button className="back-btn" onClick={() => navigate(`/land/${id}`)}>Quay lại</button>
                        <button
                            className="submit-btn"
                            onClick={handleCreateEscrow}
                            disabled={loading}
                        >
                            {loading ? 'Đang xử lý...' : 'Xác nhận đặt cọc'}
                        </button>
                    </div>
                </>
            )}

            {escrow && escrow.state === 'Confirmed' && (
                <div className="escrow-actions">
                    <button
                        className="dispute-btn"
                        onClick={() => setShowDisputeForm(true)}
                    >
                        Tạo tranh chấp
                    </button>
                    <button
                        className="partial-refund-btn"
                        onClick={() => setShowPartialRefundForm(true)}
                    >
                        Hoàn tiền một phần
                    </button>
                </div>
            )}

            {showDisputeForm && (
                <div className="dispute-form">
                    <h3>Tạo tranh chấp</h3>
                    <textarea
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Nhập lý do tranh chấp..."
                        required
                    />
                    <div className="form-actions">
                        <button onClick={handleRaiseDispute}>Xác nhận</button>
                        <button onClick={() => setShowDisputeForm(false)}>Hủy</button>
                    </div>
                </div>
            )}

            {showPartialRefundForm && (
                <div className="partial-refund-form">
                    <h3>Hoàn tiền một phần</h3>
                    <input
                        type="number"
                        value={partialRefundAmount}
                        onChange={(e) => setPartialRefundAmount(e.target.value)}
                        placeholder="Nhập số tiền hoàn trả (ETH)"
                        min="0"
                        step="0.01"
                        required
                    />
                    <div className="form-actions">
                        <button onClick={handlePartialRefund}>Xác nhận</button>
                        <button onClick={() => setShowPartialRefundForm(false)}>Hủy</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreateDepositAgreement;