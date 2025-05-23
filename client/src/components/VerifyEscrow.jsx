import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SyncService from '../utils/syncService';
import './VerifyEscrow.css';

function VerifyEscrow({ web3, escrowContract, accounts }) {
    const { id } = useParams();
    const [escrow, setEscrow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncService, setSyncService] = useState(null);
    const [userEscrows, setUserEscrows] = useState([]);

    // Tạo mã xác thực
    const generateVerificationCode = (escrowData) => {
        if (!escrowData) return '';

        try {
            // Tạo chuỗi cơ sở từ ID và timestamp
            const timestamp = Number(escrowData.createdAt) * 1000;
            const baseString = `${id}-${timestamp}`;

            // Tạo hash từ chuỗi cơ sở
            const hash = web3.utils.sha3(baseString);

            // Lấy 8 ký tự đầu tiên và chuyển thành chữ hoa
            return hash.substring(2, 10).toUpperCase();
        } catch (error) {
            console.error('Error generating verification code:', error);
            return '';
        }
    };

    useEffect(() => {
        const fetchEscrow = async () => {
            if (!escrowContract || !web3) {
                setError('Không thể kết nối hợp đồng hoặc Web3');
                setLoading(false);
                return;
            }

            try {
                // Kiểm tra danh sách escrow của người dùng
                if (accounts && accounts.length > 0) {
                    const escrows = await escrowContract.methods.getUserEscrows(accounts[0]).call();
                    setUserEscrows(escrows);
                    console.log('User Escrows:', escrows);

                    // Kiểm tra xem ID có trong danh sách không
                    const escrowId = BigInt(id);
                    if (!escrows.includes(escrowId)) {
                        setError(`ID hợp đồng ${id} không tồn tại trong danh sách của bạn. Các ID hợp lệ: ${escrows.join(', ')}`);
                        setLoading(false);
                        return;
                    }
                }

                const details = await escrowContract.methods.getEscrowDetails(id).call();
                console.log('Escrow Details:', details);

                if (details.buyer === '0x0000000000000000000000000000000000000000') {
                    setError('Không tìm thấy hợp đồng đặt cọc này');
                    setLoading(false);
                    return;
                }

                setEscrow(details);
                // Tạo mã xác thực
                const code = generateVerificationCode(details);
                setVerificationCode(code);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching escrow:', error);
                setError('Lỗi khi tải thông tin hợp đồng');
                setLoading(false);
            }
        };

        fetchEscrow();
    }, [id, escrowContract, web3, accounts]);

    useEffect(() => {
        if (web3 && escrowContract) {
            setSyncService(new SyncService(web3, escrowContract));
        }
    }, [web3, escrowContract]);

    useEffect(() => {
        const verifyAndSync = async () => {
            if (!syncService) return;

            try {
                setLoading(true);
                const syncResult = await syncService.syncEscrowData(id);
                setSyncStatus(syncResult);

                if (syncResult.isSynced) {
                    setEscrow(syncResult.blockchainData);
                    if (syncResult.ipfsData) {
                        // Xử lý dữ liệu IPFS nếu có
                        console.log('IPFS data available:', syncResult.ipfsData);
                    }
                } else {
                    setError(syncResult.error || 'Lỗi khi xác thực và đồng bộ dữ liệu');
                }
            } catch (error) {
                console.error('Error in verification:', error);
                setError('Lỗi khi xác thực và đồng bộ dữ liệu');
            } finally {
                setLoading(false);
            }
        };

        verifyAndSync();
    }, [id, syncService]);

    if (loading) return <div>Đang xác thực hợp đồng...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="verify-escrow-container">
            <h2>Xác thực hợp đồng đặt cọc #{id}</h2>
            <div className="escrow-info">
                <p><strong>Mã xác thực:</strong> {verificationCode || 'Đang tạo...'}</p>
                <p><strong>Trạng thái:</strong> {escrow.state}</p>
                <p><strong>Bên mua:</strong> {escrow.buyer}</p>
                <p><strong>Bên bán:</strong> {escrow.seller}</p>
                <p><strong>Số tiền đặt cọc:</strong> {web3.utils.fromWei(escrow.amount.toString(), 'ether')} ETH</p>
                <p><strong>Ngày tạo:</strong> {new Date(Number(escrow.createdAt) * 1000).toLocaleString('vi-VN')}</p>
                <p><strong>Hạn chót:</strong> {new Date(Number(escrow.deadline) * 1000).toLocaleString('vi-VN')}</p>
                <p><strong>Hash hợp đồng trên IPFS:</strong> <a href={`https://ipfs.io/ipfs/${escrow.agreementHash}`} target="_blank" rel="noopener noreferrer">{escrow.agreementHash}</a></p>
            </div>
            <div className="verify-status success">Hợp đồng đặt cọc này là hợp lệ và xác thực trên blockchain.</div>

            {syncStatus && (
                <div className="sync-status">
                    <h3>Trạng thái đồng bộ:</h3>
                    <p>Blockchain: {syncStatus.blockchainData ? '✓' : '✗'}</p>
                    <p>IPFS: {syncStatus.ipfsData ? '✓' : '✗'}</p>
                    <p>Metadata: {syncStatus.syncHash ? '✓' : '✗'}</p>
                    {syncStatus.syncHash && (
                        <p>
                            <a
                                href={`https://ipfs.io/ipfs/${syncStatus.syncHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Xem metadata đồng bộ
                            </a>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

export default VerifyEscrow; 