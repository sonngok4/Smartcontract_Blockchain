import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EscrowDetails.css';

function EscrowDetails({ web3, contract, escrowContract, accounts }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
            </div>
        </div>
    );
}

export default EscrowDetails; 