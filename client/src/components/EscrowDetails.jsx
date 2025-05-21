import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import EscrowAgreementService from '../services/EscrowAgreementService.js';
import './EscrowDetails.css';

function EscrowDetails({ web3, contract, escrowContract, accounts }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [escrowAgreementService, setEscrowAgreementService] = useState(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    useEffect(() => {
        const fetchEscrowDetails = async () => {
            if (!escrowContract || !accounts || accounts.length === 0) {
                setLoading(false);
                return;
            }

            try {
                const details = await escrowContract.methods.getEscrowDetails(id).call();
                const landDetails = await contract.methods.getLandDetails(details.landId).call();

                // Fetch metadata
                let metadata = null;
                try {
                    const tokenURI = await contract.methods.tokenURI(details.landId).call();
                    if (tokenURI) {
                        const ipfsHash = tokenURI.replace('ipfs://', '');
                        const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
                        metadata = await response.json();
                    }
                } catch (err) {
                    console.error('Error fetching metadata:', err);
                }

                setEscrow({
                    id,
                    ...details,
                    landDetails,
                    metadata
                });
                setLoading(false);
            } catch (err) {
                console.error('Error fetching escrow details:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchEscrowDetails();
    }, [escrowContract, contract, accounts, id]);

    useEffect(() => {
        if (web3 && contract) {
            const service = new EscrowAgreementService(web3, contract);
            setEscrowAgreementService(service);
        }
    }, [web3, contract]);

    const getEscrowStatus = (state) => {
        const statusMap = {
            '0': 'Đã tạo',
            '1': 'Đã xác nhận',
            '2': 'Đã hoàn thành',
            '3': 'Đã hủy',
            '4': 'Đã hoàn tiền',
            '5': 'Đang tranh chấp',
            '6': 'Đã giải quyết'
        };
        return statusMap[state] || 'Không xác định';
    };

    const handleDownloadAgreement = async () => {
        if (!escrowAgreementService || !escrow) {
            toast.error('Không thể tải xuống hợp đồng');
            return;
        }

        try {
            setGeneratingPDF(true);
            toast.loading('Đang tạo file PDF...');

            // Lấy thông tin người mua và người bán từ IPFS nếu có
            let buyerData = {
                walletAddress: escrow.buyer
            };
            let sellerData = {
                walletAddress: escrow.seller
            };

            // Thử lấy thông tin từ agreementHash
            if (escrow.agreementHash) {
                try {
                    const response = await fetch(`https://ipfs.io/ipfs/${escrow.agreementHash}`);
                    const htmlContent = await response.text();

                    // Parse HTML để lấy thông tin
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlContent, 'text/html');

                    // Lấy thông tin người mua
                    const buyerName = doc.querySelector('.buyer-name')?.textContent;
                    const buyerIdentity = doc.querySelector('.buyer-identity')?.textContent;
                    const buyerAddress = doc.querySelector('.buyer-address')?.textContent;
                    const buyerPhone = doc.querySelector('.buyer-phone')?.textContent;
                    const buyerEmail = doc.querySelector('.buyer-email')?.textContent;

                    // Cập nhật thông tin người mua nếu có
                    if (buyerName) buyerData.fullName = buyerName;
                    if (buyerIdentity) buyerData.identityNumber = buyerIdentity;
                    if (buyerAddress) buyerData.address = buyerAddress;
                    if (buyerPhone) buyerData.phoneNumber = buyerPhone;
                    if (buyerEmail) buyerData.email = buyerEmail;

                    // Lấy thông tin người bán
                    const sellerName = doc.querySelector('.seller-name')?.textContent;
                    const sellerIdentity = doc.querySelector('.seller-identity')?.textContent;
                    const sellerContact = doc.querySelector('.seller-contact')?.textContent;

                    // Cập nhật thông tin người bán nếu có
                    if (sellerName) sellerData.fullName = sellerName;
                    if (sellerIdentity) sellerData.identityNumber = sellerIdentity;
                    if (sellerContact) sellerData.contactInfo = sellerContact;
                } catch (err) {
                    console.warn('Could not fetch agreement details from IPFS:', err);
                }
            }

            const escrowData = {
                escrowId: id,
                amount: escrow.amount.toString(),
                deadline: Number(escrow.deadline)
            };

            const landData = {
                id: escrow.landId,
                location: escrow.landDetails.location,
                area: escrow.landDetails.area,
                price: escrow.landDetails.price.toString(),
                owner: escrow.landDetails.owner,
                documentHash: escrow.landDetails.documentHash,
                metadata: escrow.metadata
            };

            const { content: pdfBlob } = await escrowAgreementService.generateAgreement(
                escrowData,
                landData,
                buyerData,
                sellerData,
                'pdf',
                false // Đánh dấu đây là hợp đồng đã tồn tại
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

            toast.dismiss();
            toast.success('Đã tải xuống hợp đồng thành công');
        } catch (err) {
            console.error('Error downloading agreement:', err);
            toast.error('Có lỗi khi tải xuống hợp đồng: ' + err.message);
        } finally {
            setGeneratingPDF(false);
        }
    };

    const viewAgreementOnIPFS = () => {
        if (escrow?.agreementHash) {
            window.open(`https://ipfs.io/ipfs/${escrow.agreementHash}`, '_blank');
        } else {
            toast.error('Không tìm thấy hợp đồng trên IPFS');
        }
    };

    if (loading) {
        return <div className="loading">Đang tải thông tin đặt cọc...</div>;
    }

    if (error) {
        return <div className="error">Có lỗi xảy ra: {error}</div>;
    }

    if (!escrow) {
        return <div className="not-found">Không tìm thấy thông tin đặt cọc</div>;
    }

    return (
        <div className="escrow-details-page">
            <button className="back-button" onClick={() => navigate('/escrows')}>
                ← Quay lại
            </button>

            <div className="escrow-details-container">
                <h2>Chi tiết đặt cọc #{escrow.id}</h2>

                <div className="land-info">
                    <h3>Thông tin bất động sản</h3>
                    <div className="land-image">
                        {escrow.metadata && escrow.metadata.image ? (
                            <img
                                src={escrow.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                                alt={`Land ${escrow.landId}`}
                            />
                        ) : (
                            <div className="image-placeholder">Không có hình ảnh</div>
                        )}
                    </div>
                    <div className="land-details">
                        <p><strong>Tên:</strong> {escrow.metadata?.name || `Bất động sản #${escrow.landId}`}</p>
                        <p><strong>Vị trí:</strong> {escrow.landDetails.location}</p>
                        <p><strong>Diện tích:</strong> {escrow.landDetails.area} m²</p>
                    </div>
                </div>

                <div className="escrow-info">
                    <h3>Thông tin đặt cọc</h3>
                    <p><strong>Người mua:</strong> {escrow.buyer}</p>
                    <p><strong>Người bán:</strong> {escrow.seller}</p>
                    <p><strong>Số tiền:</strong> {web3.utils.fromWei(escrow.amount.toString(), 'ether')} ETH</p>
                    <p><strong>Trạng thái:</strong> {getEscrowStatus(escrow.state)}</p>
                    <p><strong>Ngày tạo:</strong> {new Date(Number(escrow.createdAt) * 1000).toLocaleDateString('vi-VN')}</p>
                    <p><strong>Hạn chót:</strong> {new Date(Number(escrow.deadline) * 1000).toLocaleDateString('vi-VN')}</p>
                    {escrow.completedAt > 0 && (
                        <p><strong>Ngày hoàn thành:</strong> {new Date(Number(escrow.completedAt) * 1000).toLocaleDateString('vi-VN')}</p>
                    )}
                    {escrow.cancelReason && (
                        <p><strong>Lý do hủy:</strong> {escrow.cancelReason}</p>
                    )}
                </div>

                <div className="agreement-documents">
                    <h3>Giấy tờ hợp đồng</h3>
                    <div className="document-actions">
                        <button
                            className="view-agreement-btn"
                            onClick={viewAgreementOnIPFS}
                            disabled={!escrow.agreementHash}
                        >
                            Xem hợp đồng trên IPFS
                        </button>
                        <button
                            className="download-agreement-btn"
                            onClick={handleDownloadAgreement}
                            disabled={generatingPDF}
                        >
                            {generatingPDF ? 'Đang tạo PDF...' : 'Tải xuống hợp đồng PDF'}
                        </button>
                    </div>
                    {escrow.agreementHash && (
                        <p className="agreement-hash">
                            <strong>Mã hợp đồng IPFS:</strong> {escrow.agreementHash}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EscrowDetails; 