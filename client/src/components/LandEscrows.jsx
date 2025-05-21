import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { formatWeiToEth } from '../utils/utils';
import EscrowCard from './EscrowCard';
import './LandEscrows.css';

function LandEscrows({ web3, contract, escrowContract, accounts }) {
    const { landId } = useParams();
    const [escrows, setEscrows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [landDetails, setLandDetails] = useState(null);
    const [filter, setFilter] = useState('all'); // all, active, completed, disputed

    const fetchEscrows = async () => {
        if (!landId || !contract || !escrowContract || !accounts || accounts.length === 0) {
            setLoading(false);
            return;
        }

        try {
            toast.loading('Đang tải danh sách đặt cọc...');

            // Lấy thông tin bất động sản
            const land = await contract.methods.getLandDetails(landId).call();
            console.log('Land details:', land);
            setLandDetails(land);

            // Lấy tất cả escrow của bất động sản này
            const allEscrowIds = await escrowContract.methods.getLandEscrows(landId).call();
            console.log("All escrow IDs for land:", allEscrowIds);

            // Lấy chi tiết từng escrow
            const details = await Promise.all(
                allEscrowIds.map(async (id) => {
                    try {
                        const escrowDetails = await escrowContract.methods.getEscrowDetails(id).call();
                        const metadata = await fetchMetadata(landId);

                        return {
                            id: id.toString(),
                            ...escrowDetails,
                            landId: escrowDetails.landId.toString(),
                            state: escrowDetails.state.toString(),
                            amount: escrowDetails.amount.toString(),
                            metadata
                        };
                    } catch (err) {
                        console.error(`Error fetching escrow details for ID ${id}:`, err);
                        return null;
                    }
                })
            );

            // Filter out failed fetches and only show escrows where the current user is either buyer or seller
            const validEscrows = details.filter(escrow =>
                escrow !== null && (
                    escrow.buyer.toLowerCase() === accounts[0].toLowerCase() ||
                    escrow.seller.toLowerCase() === accounts[0].toLowerCase() ||
                    land.owner.toLowerCase() === accounts[0].toLowerCase()
                )
            );

            console.log("Valid escrows for land:", validEscrows);
            setEscrows(validEscrows);
            setLoading(false);
            toast.dismiss();
            toast.success('Đã tải danh sách đặt cọc thành công');
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
            toast.error('Có lỗi khi tải danh sách đặt cọc: ' + err.message);
            setLoading(false);
        }
    };

    // Helper function to fetch metadata
    const fetchMetadata = async (landId) => {
        try {
            const tokenURI = await contract.methods.tokenURI(landId).call();
            if (tokenURI) {
                const ipfsHash = tokenURI.replace('ipfs://', '');
                const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
                return await response.json();
            }
        } catch (err) {
            console.error('Error fetching metadata:', err);
            return null;
        }
    };

    useEffect(() => {
        fetchEscrows();
    }, [landId, accounts, contract, escrowContract]);

    const handleConfirmEscrow = async (escrowId) => {
        try {
            await escrowContract.methods.confirmEscrow(escrowId).send({ from: accounts[0] });
            toast.success('Đã xác nhận đặt cọc thành công');
            fetchEscrows();
        } catch (err) {
            console.error('Error confirming escrow:', err);
            toast.error('Có lỗi khi xác nhận đặt cọc');
        }
    };

    const handleCancelEscrow = async (escrowId) => {
        try {
            await escrowContract.methods
                .cancelEscrow(escrowId, 'Hủy theo yêu cầu')
                .send({ from: accounts[0] });
            toast.success('Đã hủy đặt cọc thành công');
            fetchEscrows();
        } catch (err) {
            console.error('Error cancelling escrow:', err);
            toast.error('Có lỗi khi hủy đặt cọc');
        }
    };

    const handleCompleteEscrow = async (escrowId) => {
        try {
            await escrowContract.methods.completeEscrow(escrowId).send({ from: accounts[0] });
            toast.success('Đã hoàn thành giao dịch đặt cọc');
            fetchEscrows();
        } catch (err) {
            console.error('Error completing escrow:', err);
            toast.error('Có lỗi khi hoàn thành giao dịch');
        }
    };

    const filteredEscrows = escrows.filter(escrow => {
        if (filter === 'all') return true;

        const state = escrow.state;
        if (filter === 'active' && ['0', '1'].includes(state)) return true;
        if (filter === 'completed' && ['2', '4'].includes(state)) return true;
        if (filter === 'disputed' && ['5', '6'].includes(state)) return true;

        return false;
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
        <div className="land-escrows">
            <h2>Quản lý đặt cọc cho bất động sản #{landId}</h2>

            {landDetails && (
                <div className="land-info">
                    <p><strong>Địa chỉ:</strong> {landDetails.location}</p>
                    <p><strong>Diện tích:</strong> {landDetails.area} m²</p>
                    <p><strong>Giá:</strong> {formatWeiToEth(web3, landDetails.price)} ETH</p>
                </div>
            )}

            <div className="filters">
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
                    <p>Không có đặt cọc nào cho bất động sản này</p>
                    <Link to="/marketplace" className="browse-btn">Quay lại thị trường</Link>
                </div>
            ) : (
                <div className="escrows-grid">
                    {filteredEscrows.map((escrow) => (
                        <EscrowCard
                            key={escrow.id}
                            escrow={escrow}
                            web3={web3}
                            role={escrow.buyer === accounts[0] ? 'buyer' : 'seller'}
                            onConfirm={handleConfirmEscrow}
                            onCancel={handleCancelEscrow}
                            onComplete={handleCompleteEscrow}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default LandEscrows;
