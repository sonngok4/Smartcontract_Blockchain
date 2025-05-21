import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import EscrowCard from './EscrowCard';
import './EscrowManagement.css';

function EscrowManagement({ web3, contract, escrowContract, accounts }) {
    const [escrows, setEscrows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, active, completed, disputed
    const [role, setRole] = useState('all'); // 'all', 'buyer', 'seller'

    const fetchEscrows = async () => {
        if (!escrowContract || !accounts || accounts.length === 0) {
            setLoading(false);
            return;
        }

        try {
            // Lấy danh sách escrow của người dùng
            const userEscrowIds = await escrowContract.methods.getUserEscrows(accounts[0]).call();
            console.log("User escrow IDs:", userEscrowIds);

            // Lấy thông tin chi tiết cho từng escrow
            const escrowDetails = await Promise.all(
                userEscrowIds.map(async (id) => {
                    const details = await escrowContract.methods.getEscrowDetails(id).call();
                    const landDetails = await contract.methods.getLandDetails(details.landId).call();

                    // Convert BigInt to string for comparison
                    return {
                        id: id.toString(),
                        ...details,
                        state: details.state.toString(),
                        landId: details.landId.toString(),
                        amount: details.amount.toString(),
                        landDetails,
                        metadata: await fetchMetadata(details.landId)
                    };
                })
            );
            console.log("Fetched escrow details:", escrowDetails);
            setEscrows(escrowDetails);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching escrows:', err);
            setError(err.message);
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
    }, [escrowContract, contract, accounts]);

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

    const filteredEscrows = escrows.filter(escrow => {
        console.log("Filtering escrow:", escrow);

        // Filter by role
        if (role !== 'all') {
            const userAddress = accounts[0].toLowerCase();
            if (role === 'buyer' && escrow.buyer.toLowerCase() !== userAddress) return false;
            if (role === 'seller' && escrow.seller.toLowerCase() !== userAddress) return false;
        }

        // Filter by status
        if (filter !== 'all') {
            const state = escrow.state;
            if (filter === 'active' && !['0', '1'].includes(state)) return false;
            if (filter === 'completed' && !['2', '4'].includes(state)) return false;
            if (filter === 'disputed' && !['5', '6'].includes(state)) return false;
        }

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

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="role-select"
                >
                    <option value="all">Tất cả</option>
                    <option value="buyer">Tôi là người mua</option>
                    <option value="seller">Tôi là người bán</option>
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

export default EscrowManagement; 