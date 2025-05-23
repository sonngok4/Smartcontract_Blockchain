import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './VerifyEscrow.css';

function VerifyEscrow({ web3, escrowContract }) {
    const { id } = useParams();
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');

    useEffect(() => {
        const fetchEscrow = async () => {
            if (!escrowContract || !web3) {
                setError('Không thể kết nối hợp đồng hoặc Web3');
                setLoading(false);
                return;
            }
            try {
                const details = await escrowContract.methods.getEscrowDetails(id).call();
                setEscrow(details);
                // Tạo mã xác thực giống như trong EscrowAgreementService
                const timestamp = new Date(details.createdAt * 1000).getTime();
                const baseString = `${id}-${timestamp}`;
                const hash = web3.utils.sha3(baseString);
                setVerificationCode(hash.substring(2, 10).toUpperCase());
                setLoading(false);
            } catch {
                setError('Không tìm thấy hợp đồng đặt cọc này.');
                setLoading(false);
            }
        };
        fetchEscrow();
    }, [id, escrowContract, web3]);

    if (loading) return <div>Đang xác thực hợp đồng...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="verify-escrow-container">
            <h2>Xác thực hợp đồng đặt cọc #{id}</h2>
            <div className="escrow-info">
                <p><strong>Mã xác thực:</strong> {verificationCode}</p>
                <p><strong>Trạng thái:</strong> {escrow.state}</p>
                <p><strong>Bên mua:</strong> {escrow.buyer}</p>
                <p><strong>Bên bán:</strong> {escrow.seller}</p>
                <p><strong>Số tiền đặt cọc:</strong> {web3.utils.fromWei(escrow.amount, 'ether')} ETH</p>
                <p><strong>Ngày tạo:</strong> {new Date(escrow.createdAt * 1000).toLocaleString('vi-VN')}</p>
                <p><strong>Hạn chót:</strong> {new Date(escrow.deadline * 1000).toLocaleString('vi-VN')}</p>
                <p><strong>Hash hợp đồng trên IPFS:</strong> <a href={`https://ipfs.io/ipfs/${escrow.agreementHash}`} target="_blank" rel="noopener noreferrer">{escrow.agreementHash}</a></p>
            </div>
            <div className="verify-status success">Hợp đồng đặt cọc này là hợp lệ và xác thực trên blockchain.</div>
        </div>
    );
}

export default VerifyEscrow; 