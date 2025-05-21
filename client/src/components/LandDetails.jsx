import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import './LandDetails.css';

function LandDetails({ web3, contract, accounts }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [land, setLand] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPercentage, setDepositPercentage] = useState(10); // Mặc định 10% giá trị bất động sản

  useEffect(() => {
    const fetchLandDetails = async () => {
      try {
        const landDetails = await contract.methods.getLandDetails(id).call();
        setLand(landDetails);
        setIsOwner(accounts[0] && accounts[0].toLowerCase() === landDetails.owner.toLowerCase());
        const history = await contract.methods.getTransactionHistory(id).call();
        setTransactions(history);

        try {
          const tokenURI = await contract.methods.tokenURI(id).call();
          if (tokenURI) {
            const ipfsHash = tokenURI.replace('ipfs://', '');
            const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
            const data = await response.json();
            setMetadata(data);
          }
          toast.dismiss();
          toast.success('Tải thông tin bất động sản thành công!');
        } catch (err) {
          console.error('Error fetching metadata:', err);
          toast.error('Có lỗi khi tải thông tin bất động sản: ' + err.message);
          setMetadata(null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching land details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (contract && accounts) {
      fetchLandDetails();
    }
  }, [contract, id, accounts]);

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Đang cập nhật giá rao bán...');
      const priceInWei = web3.utils.toWei(newPrice, 'ether');
      await contract.methods.updateLandPrice(id, priceInWei).send({ from: accounts[0] });
      const updatedLand = await contract.methods.getLandDetails(id).call();
      setLand(updatedLand);
      toast.dismiss();
      setNewPrice('');
      toast.success('Cập nhật giá rao bán thành công!');
    } catch (err) {
      console.error('Error updating price:', err);
      toast.error('Có lỗi khi cập nhật giá rao bán: ' + err.message);
    }
  };

  const handleSetForSale = async () => {
    try {
      toast.loading('Đang cập nhật trạng thái...');
      await contract.methods.setForSale(id, !land.forSale).send({ from: accounts[0] });
      const updatedLand = await contract.methods.getLandDetails(id).call();
      setLand(updatedLand);
      toast.dismiss();
      toast.success(updatedLand.forSale ? 'Bất động sản đã được mở cho đặt cọc' : 'Bất động sản đã được đóng đặt cọc');
    } catch (err) {
      console.error('Error updating sale status:', err);
      toast.error('Có lỗi khi cập nhật trạng thái: ' + err.message);
    }
  };

  const handleCreateDeposit = async () => {
    try {
      if (!land.forSale) {
        toast.error('Bất động sản này không được mở cho đặt cọc');
        return;
      }

      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        toast.error('Vui lòng nhập số tiền đặt cọc hợp lệ');
        return;
      }

      const listingPrice = web3.utils.fromWei(land.price, 'ether');
      const suggestedDeposit = (parseFloat(listingPrice) * depositPercentage / 100).toFixed(4);

      if (parseFloat(depositAmount) < parseFloat(suggestedDeposit)) {
        toast.error(`Số tiền đặt cọc tối thiểu phải là ${suggestedDeposit} ETH (${depositPercentage}% giá trị bất động sản)`);
        return;
      }

      // Chuyển hướng đến trang tạo hợp đồng đặt cọc
      navigate(`/create-deposit/${id}`, {
        state: {
          landId: id,
          depositAmount: depositAmount,
          listingPrice: listingPrice,
          landDetails: land,
          metadata: metadata
        }
      });
    } catch (err) {
      console.error('Error creating deposit:', err);
      toast.error('Có lỗi khi tạo đặt cọc: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải thông tin bất động sản...</div>;
  }

  if (error) {
    return <div className="error">Có lỗi xảy ra: {error}</div>;
  }

  if (!land) {
    return <div className="not-found">Không tìm thấy thông tin bất động sản với ID: {id}</div>;
  }

  const listingPrice = web3.utils.fromWei(land.price, 'ether');
  const suggestedDeposit = (parseFloat(listingPrice) * depositPercentage / 100).toFixed(4);

  return (
    <div className="land-details">
      <h2>Chi tiết bất động sản #{id}</h2>

      <div className="land-container">
        <div className="land-image">
          {metadata && metadata.image ? (
            <img
              src={metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
              alt={`Land ${id}`}
            />
          ) : (
            <div className="image-placeholder">Không có hình ảnh</div>
          )}
        </div>

        <div className="land-info">
          <h3>{metadata?.name || `Bất động sản #${id}`}</h3>
          <p className="description">{metadata?.description || 'Không có mô tả'}</p>

          <div className="info-item">
            <span className="label">Vị trí:</span>
            <span className="value">{land.location}</span>
          </div>

          <div className="info-item">
            <span className="label">Diện tích:</span>
            <span className="value">{land.area} m²</span>
          </div>

          <div className="info-item">
            <span className="label">Chủ sở hữu:</span>
            <span className="value">{land.owner}</span>
          </div>

          <div className="info-item">
            <span className="label">Giá rao bán:</span>
            <span className="value">
              {land.price > 0 ? `${listingPrice} ETH` : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="info-item">
            <span className="label">Trạng thái:</span>
            <span className={`value status ${land.forSale ? 'for-sale' : 'not-for-sale'}`}>
              {land.forSale ? 'Đang mở đặt cọc' : 'Đã đóng đặt cọc'}
            </span>
          </div>

          <div className="info-item">
            <span className="label">Giấy tờ:</span>
            <span className="value">
              {land.documentHash ? (
                <a
                  href={`https://ipfs.io/ipfs/${land.documentHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Xem giấy tờ
                </a>
              ) : (
                'Không có giấy tờ'
              )}
            </span>
          </div>

          {isOwner && (
            <div className="owner-actions">
              <h4>Quản lý bất động sản</h4>

              <form onSubmit={handleUpdatePrice} className="price-form">
                <div className="form-group">
                  <label htmlFor="newPrice">Cập nhật giá rao bán (ETH):</label>
                  <input
                    type="number"
                    id="newPrice"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <button type="submit" className="btn update-btn">Cập nhật giá rao bán</button>
              </form>

              <button
                onClick={handleSetForSale}
                className={`btn ${land.forSale ? 'remove-btn' : 'list-btn'}`}
                disabled={land.price <= 0 && !land.forSale}
              >
                {land.forSale ? 'Đóng đặt cọc' : 'Mở đặt cọc'}
              </button>
            </div>
          )}

          {!isOwner && land.forSale && (
            <div className="deposit-actions">
              <div className="deposit-info">
                <p className="suggested-deposit">
                  <strong>Đề xuất số tiền đặt cọc:</strong> {suggestedDeposit} ETH ({depositPercentage}% giá trị bất động sản)
                </p>
              </div>
              <div className="deposit-form">
                <label htmlFor="depositAmount">Số tiền đặt cọc (ETH):</label>
                <input
                  type="number"
                  id="depositAmount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min={suggestedDeposit}
                  step="0.01"
                  placeholder={`Tối thiểu ${suggestedDeposit} ETH`}
                />
                <button onClick={handleCreateDeposit} className="btn deposit-btn">
                  Tạo hợp đồng đặt cọc
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="transaction-history">
        <h3>Lịch sử giao dịch</h3>
        {transactions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Từ</th>
                <th>Đến</th>
                <th>Giá (ETH)</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index}>
                  <td>{tx.from === '0x0000000000000000000000000000000000000000' ? 'Đăng ký mới' : `${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}`}</td>
                  <td>{`${tx.to.substring(0, 6)}...${tx.to.substring(tx.to.length - 4)}`}</td>
                  <td>{tx.price > 0 ? web3.utils.fromWei(tx.price.toString(), 'ether') : '-'}</td>
                  <td>{new Date(Number(tx.timestamp) * 1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Không có giao dịch nào</p>
        )}
      </div>
    </div>
  );
}

export default LandDetails;