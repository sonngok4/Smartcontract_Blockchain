import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import './EscrowManagement.css';

function EscrowManagement({ web3, contract, escrowContract, accounts }) {
    const [escrows, setEscrows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, active, completed, disputed

    useEffect(() => {
        const fetchEscrows = async () => {
            if (!escrowContract || !accounts || accounts.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Lấy danh sách escrow của người dùng
                const userEscrowIds = await escrowContract.methods.getUserEscrows(accounts[0]).call();

                // Lấy thông tin chi tiết cho từng escrow
                const escrowDetails = await Promise.all(
                    userEscrowIds.map(async (id) => {
                        const details = await escrowContract.methods.getEscrowDetails(id).call();
                        const landDetails = await contract.methods.getLandDetails(details.landId).call();

                        // Lấy metadata của bất động sản
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

                        return {
                            id,
                            ...details,
                            landDetails,
                            metadata
                        };
                    })
                );

                setEscrows(escrowDetails);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching escrows:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        fetchEscrows();
    }, [escrowContract, contract, accounts]);

    const handleConfirmEscrow = async (escrowId) => {
        try {
            await escrowContract.methods.confirmEscrow(escrowId).send({ from: accounts[0] });
            toast.success('Đã xác nhận đặt cọc thành công');
            // Cập nhật lại danh sách
            const updatedEscrow = await escrowContract.methods.getEscrowDetails(escrowId).call();
            setEscrows(prev => prev.map(escrow =>
                escrow.id === escrowId ? { ...escrow, ...updatedEscrow } : escrow
            ));
        } catch (err) {
            console.error('Error confirming escrow:', err);
            toast.error('Có lỗi khi xác nhận đặt cọc: ' + err.message);
        }
    };

    const handleCompleteEscrow = async (escrowId) => {
        try {
            await escrowContract.methods.completeEscrow(escrowId).send({ from: accounts[0] });
            toast.success('Đã hoàn thành giao dịch đặt cọc');
            // Cập nhật lại danh sách
            const updatedEscrow = await escrowContract.methods.getEscrowDetails(escrowId).call();
            setEscrows(prev => prev.map(escrow =>
                escrow.id === escrowId ? { ...escrow, ...updatedEscrow } : escrow
            ));
        } catch (err) {
            console.error('Error completing escrow:', err);
            toast.error('Có lỗi khi hoàn thành giao dịch: ' + err.message);
        }
    };

    const handleCancelEscrow = async (escrowId, reason) => {
        try {
            await escrowContract.methods.cancelEscrow(escrowId, reason).send({ from: accounts[0] });
            toast.success('Đã hủy đặt cọc thành công');
            // Cập nhật lại danh sách
            const updatedEscrow = await escrowContract.methods.getEscrowDetails(escrowId).call();
            setEscrows(prev => prev.map(escrow =>
                escrow.id === escrowId ? { ...escrow, ...updatedEscrow } : escrow
            ));
        } catch (err) {
            console.error('Error cancelling escrow:', err);
            toast.error('Có lỗi khi hủy đặt cọc: ' + err.message);
        }
    };

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

    const filteredEscrows = escrows.filter(escrow => {
        if (filter === 'all') return true;
        if (filter === 'active') return ['0', '1'].includes(escrow.state);
        if (filter === 'completed') return ['2', '4'].includes(escrow.state);
        if (filter === 'disputed') return ['5', '6'].includes(escrow.state);
        return true;
    });

    if (loading) {
        return <div className="loading">Đang tải danh sách đặt cọc...</div>;
    }

    if (error) {
        return <div className="error">Có lỗi xảy ra: {error}</div>;
    }

    if (!accounts || accounts.length === 0) {
        return <div className="not-connected">Vui lòng kết nối ví MetaMask để xem danh sách đặt cọc</div>;
    }

    return (
        <div className="escrow-management">
            <h2>Quản lý đặt cọc</h2>

            <div className="filter-section">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">Tất cả</option>
                    <option value="active">Đang hoạt động</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="disputed">Đang tranh chấp</option>
                </select>
            </div>

            {filteredEscrows.length === 0 ? (
                <div className="no-escrows">
                    <p>Bạn chưa có giao dịch đặt cọc nào</p>
                    <Link to="/marketplace" className="browse-btn">Khám phá thị trường</Link>
                </div>
            ) : (
                <div className="escrows-grid">
                    {filteredEscrows.map((escrow) => (
                        <div key={escrow.id} className="escrow-card">
                            <div className="escrow-land-info">
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
                                    <h3>{escrow.metadata?.name || `Bất động sản #${escrow.landId}`}</h3>
                                    <p><strong>Vị trí:</strong> {escrow.landDetails.location}</p>
                                    <p><strong>Diện tích:</strong> {escrow.landDetails.area} m²</p>
                                </div>
                            </div>

                            <div className="escrow-details">
                                <p><strong>Mã đặt cọc:</strong> #{escrow.id}</p>
                                <p><strong>Số tiền:</strong> {web3.utils.fromWei(escrow.amount.toString(), 'ether')} ETH</p>
                                <p><strong>Trạng thái:</strong> {getEscrowStatus(escrow.state)}</p>
                                <p><strong>Ngày tạo:</strong> {new Date(Number(escrow.createdAt) * 1000).toLocaleDateString('vi-VN')}</p>
                                <p><strong>Hạn chót:</strong> {new Date(Number(escrow.deadline) * 1000).toLocaleDateString('vi-VN')}</p>
                            </div>

                            <div className="escrow-actions">
                                {escrow.state === '0' && escrow.seller === accounts[0] && (
                                    <button
                                        className="confirm-btn"
                                        onClick={() => handleConfirmEscrow(escrow.id)}
                                    >
                                        Xác nhận đặt cọc
                                    </button>
                                )}

                                {escrow.state === '1' && (
                                    <button
                                        className="complete-btn"
                                        onClick={() => handleCompleteEscrow(escrow.id)}
                                    >
                                        Hoàn thành giao dịch
                                    </button>
                                )}

                                {['0', '1'].includes(escrow.state) && (
                                    <button
                                        className="cancel-btn"
                                        onClick={() => handleCancelEscrow(escrow.id, 'Hủy theo yêu cầu')}
                                    >
                                        Hủy đặt cọc
                                    </button>
                                )}

                                <Link to={`/escrow/${escrow.id}`} className="view-details-btn">
                                    Xem chi tiết
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default EscrowManagement; 