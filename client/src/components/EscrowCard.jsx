import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate, formatWeiToEth, getEscrowStatus } from '../utils/utils';

export default function EscrowCard({ escrow, role, web3, onConfirm, onCancel, onComplete }) {
    return (
        <div className="escrow-card">
            <div className="escrow-info">
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

                <h3>{escrow.metadata?.name || `Bất động sản #${escrow.landId}`}</h3>
                <p><strong>Vai trò:</strong> {role === 'buyer' ? 'Người mua' : 'Người bán'}</p>
                <p><strong>Trạng thái:</strong> {getEscrowStatus(escrow.state)}</p>
                <p><strong>Số tiền:</strong> {formatWeiToEth(web3, escrow.amount)} ETH</p>
                <p><strong>Ngày tạo:</strong> {formatDate(escrow.createdAt)}</p>
                <p><strong>Hạn chót:</strong> {formatDate(escrow.deadline)}</p>
            </div>

            <div className="escrow-actions">
                {role === 'seller' && escrow.state === '0' && (
                    <button onClick={() => onConfirm(escrow.id)} className="confirm-btn">
                        Xác nhận đặt cọc
                    </button>
                )}

                {['0', '1'].includes(escrow.state) && (
                    <button onClick={() => onCancel(escrow.id)} className="cancel-btn">
                        Hủy đặt cọc
                    </button>
                )}

                {role === 'seller' && escrow.state === '1' && (
                    <button onClick={() => onComplete(escrow.id)} className="complete-btn">
                        Hoàn thành giao dịch
                    </button>
                )}

                <Link to={`/escrow/${escrow.id}`} className="view-details-btn">
                    Xem chi tiết
                </Link>
            </div>
        </div>
    );
}
