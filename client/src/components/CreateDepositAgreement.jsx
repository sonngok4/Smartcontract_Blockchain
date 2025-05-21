import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import EscrowAgreementService from '../services/EscrowAgreementService.js';
import { uploadFileToIPFS } from '../utils/ipfsService.js';
import './CreateDepositAgreement.css';

function CreateDepositAgreement({ web3, contract, escrowContract, accounts }) {
    const { id } = useParams(); // ID của bất động sản
    const navigate = useNavigate();
    const [escrowAgreementService, setEscrowAgreementService] = useState(null);

    const [land, setLand] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositDuration, setDepositDuration] = useState(30); // Mặc định 30 ngày
    const [contactInfo, setContactInfo] = useState('');
    const [buyerInfo, setBuyerInfo] = useState({
        fullName: '',
        identityNumber: '',
        address: '',
        phoneNumber: '',
        email: ''
    });
    const [agreementPreview, setAgreementPreview] = useState(null);
    const [agreementPDF, setAgreementPDF] = useState(null);
    const [error, setError] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [showDisputeForm, setShowDisputeForm] = useState(false);
    const [partialRefundAmount, setPartialRefundAmount] = useState('');
    const [showPartialRefundForm, setShowPartialRefundForm] = useState(false);
    const [escrowId, setEscrowId] = useState(null);
    const [escrow, setEscrow] = useState(null);

    useEffect(() => {
        if (web3 && contract) {
            const service = new EscrowAgreementService(web3, contract);
            setEscrowAgreementService(service);
        }
    }, [web3, contract]);

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

    const handleDownloadPDF = async () => {
        if (!escrowAgreementService || !land || !buyerInfo) {
            toast.error('Thiếu thông tin cần thiết để tạo hợp đồng');
            return;
        }

        try {
            setLoading(true);
            toast.loading('Đang tạo file PDF...');

            const escrowData = {
                escrowId: escrowId || Date.now().toString(),
                amount: web3.utils.toWei(depositAmount.toString(), 'ether'),
                deadline: Math.floor(Date.now() / 1000) + (depositDuration * 24 * 60 * 60)
            };

            const buyerData = {
                walletAddress: accounts[0],
                ...buyerInfo
            };

            const sellerData = {
                walletAddress: land.owner,
                contactInfo: land.contactInfo || ''
            };

            const { content: pdfBlob } = await escrowAgreementService.generateAgreement(
                escrowData,
                land,
                buyerData,
                sellerData,
                'pdf'
            );

            // Tạo URL cho blob và tải xuống
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `hop-dong-dat-coc-${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pdfUrl);

            setAgreementPDF(pdfBlob);
            toast.dismiss();
            toast.success('Đã tạo file PDF thành công');
        } catch (err) {
            console.error('Error generating PDF:', err);
            toast.error('Có lỗi khi tạo file PDF');
        } finally {
            setLoading(false);
        }
    };

    const generateAgreement = async () => {
        if (!escrowAgreementService || !land || !buyerInfo.fullName || !buyerInfo.identityNumber) {
            toast.error('Vui lòng điền đầy đủ thông tin cá nhân');
            return;
        }

        setGenerating(true);
        toast.loading('Đang tạo hợp đồng...');

        try {
            const escrowData = {
                escrowId: escrowId || Date.now().toString(),
                amount: web3.utils.toWei(depositAmount.toString(), 'ether'),
                deadline: Math.floor(Date.now() / 1000) + (depositDuration * 24 * 60 * 60)
            };

            const buyerData = {
                walletAddress: accounts[0],
                ...buyerInfo
            };

            const sellerData = {
                walletAddress: land.owner,
                contactInfo: land.contactInfo || ''
            };

            // Ensure land data has all required fields
            const landDataForAgreement = {
                id: land.id,
                location: land.location,
                area: land.area,
                price: land.price,
                owner: land.owner,
                documentHash: land.documentHash,
                metadata: land.metadata
            };

            const { content: htmlContent } = await escrowAgreementService.generateAgreement(
                escrowData,
                landDataForAgreement,
                buyerData,
                sellerData,
                'html'
            );

            setAgreementPreview(htmlContent);
            toast.dismiss();
            toast.success('Đã tạo hợp đồng thành công');
        } catch (err) {
            console.error('Error generating agreement:', err);
            toast.error('Có lỗi khi tạo hợp đồng: ' + err.message);
        } finally {
            setGenerating(false);
        }
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

            <div className="buyer-info-form">
                <h3>Thông tin cá nhân người mua</h3>
                <div className="form-group">
                    <label>Họ và tên:</label>
                    <input
                        type="text"
                        value={buyerInfo.fullName}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, fullName: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Số CMND/CCCD:</label>
                    <input
                        type="text"
                        value={buyerInfo.identityNumber}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, identityNumber: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Địa chỉ thường trú:</label>
                    <input
                        type="text"
                        value={buyerInfo.address}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, address: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Số điện thoại:</label>
                    <input
                        type="tel"
                        value={buyerInfo.phoneNumber}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, phoneNumber: e.target.value })}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Email:</label>
                    <input
                        type="email"
                        value={buyerInfo.email}
                        onChange={(e) => setBuyerInfo({ ...buyerInfo, email: e.target.value })}
                        required
                    />
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
                        <button className="download-btn" onClick={handleDownloadPDF}>
                            Tải xuống PDF
                        </button>
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