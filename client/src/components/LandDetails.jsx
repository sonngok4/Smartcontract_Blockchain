import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './LandDetails.css';
import toast from 'react-hot-toast';

function LandDetails({ web3, contract, accounts }) {
  const { id } = useParams();
  const [land, setLand] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [forSale, setForSale] = useState(false);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const fetchLandDetails = async () => {
      try {
        // Lấy thông tin chi tiết của bất động sản
        const landDetails = await contract.methods.getLandDetails(id).call();
        setLand(landDetails);

        // Kiểm tra xem người dùng hiện tại có phải là chủ sở hữu
        setIsOwner(accounts[0] && accounts[0].toLowerCase() === landDetails.owner.toLowerCase());

        // Lấy lịch sử giao dịch
        const history = await contract.methods.getTransactionHistory(id).call();
        setTransactions(history);

        // Lấy metadata từ IPFS
        try {
          const tokenURI = await contract.methods.tokenURI(id).call();
          if (tokenURI) {
            const ipfsHash = tokenURI.replace('ipfs://', '');
            const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
            const data = await response.json();
            setMetadata(data);
          }
        } catch (err) {
          console.error('Error fetching metadata:', err);
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
      const priceInWei = web3.utils.toWei(newPrice, 'ether');
      await contract.methods.updateLandPrice(id, priceInWei).send({ from: accounts[0] });

      // Cập nhật lại thông tin bất động sản
      const updatedLand = await contract.methods.getLandDetails(id).call();
      setLand(updatedLand);
      setNewPrice('');
      toast.success('Cập nhật giá thành công!');
    } catch (err) {
      console.error('Error updating price:', err);
      toast.error('Có lỗi khi cập nhật giá: ' + err.message);
    }
  };

  const handleSetForSale = async () => {
    try {
      await contract.methods.setForSale(id, !land.forSale).send({ from: accounts[0] });

      // Cập nhật lại thông tin bất động sản
      const updatedLand = await contract.methods.getLandDetails(id).call();
      setLand(updatedLand);
      setForSale(updatedLand.forSale);
      toast.success(updatedLand.forSale ? 'Bất động sản đã được đưa lên thị trường' : 'Bất động sản đã được gỡ khỏi thị trường');
    } catch (err) {
      console.error('Error updating for sale status:', err);
      toast.error('Có lỗi khi cập nhật trạng thái: ' + err.message);
    }
  };

  const handleBuyLand = async () => {
    try {
      if (!land.forSale) {
        toast.error('Bất động sản này không được rao bán');
        return;
      }

      await contract.methods.buyLand(id).send({
        from: accounts[0],
        value: land.price
      });

      // Cập nhật lại thông tin bất động sản
      const updatedLand = await contract.methods.getLandDetails(id).call();
      setLand(updatedLand);

      // Cập nhật lịch sử giao dịch
      const history = await contract.methods.getTransactionHistory(id).call();
      setTransactions(history);

      // Cập nhật trạng thái chủ sở hữu
      setIsOwner(accounts[0] && accounts[0].toLowerCase() === updatedLand.owner.toLowerCase());

      toast.success('Mua bất động sản thành công!');
    } catch (err) {
      console.error('Error buying land:', err);
      toast.error('Có lỗi khi mua bất động sản: ' + err.message);
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
            <span className="label">Giá:</span>
            <span className="value">
              {land.price > 0 ? `${web3.utils.fromWei(land.price, 'ether')} ETH` : 'Chưa thiết lập'}
            </span>
          </div>

          <div className="info-item">
            <span className="label">Trạng thái:</span>
            <span className={`value status ${land.forSale ? 'for-sale' : 'not-for-sale'}`}>
              {land.forSale ? 'Đang rao bán' : 'Không rao bán'}
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
                  <label htmlFor="newPrice">Cập nhật giá (ETH):</label>
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
                <button type="submit" className="btn update-btn">Cập nhật giá</button>
              </form>

              <button
                onClick={handleSetForSale}
                className={`btn ${land.forSale ? 'remove-btn' : 'list-btn'}`}
                disabled={land.price <= 0 && !land.forSale}
              >
                {land.forSale ? 'Gỡ khỏi thị trường' : 'Đưa lên thị trường'}
              </button>
            </div>
          )}

          {!isOwner && land.forSale && (
            <div className="buyer-actions">
              <button onClick={handleBuyLand} className="btn buy-btn">
                Mua bất động sản ({web3.utils.fromWei(land.price, 'ether')} ETH)
              </button>
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