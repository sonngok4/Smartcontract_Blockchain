import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './MyLands.css';

function MyLands({ web3, contract, escrowContract, accounts }) {
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyLands = async () => {
      if (!contract || !accounts || accounts.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Lấy danh sách ID bất động sản của người dùng hiện tại
        const landIds = await contract.methods.getLandsByOwner(accounts[0]).call();

        // Lấy thông tin chi tiết cho từng bất động sản
        const landPromises = landIds.map(async (id) => {
          const landDetails = await contract.methods.getLandDetails(id).call();

          // Lấy metadata từ IPFS nếu có
          let metadata = null;
          try {
            const tokenURI = await contract.methods.tokenURI(id).call();
            if (tokenURI) {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
              metadata = await response.json();
            }
          } catch (err) {
            console.error(`Error fetching metadata for land ${id}:`, err);
          }

          return {
            id,
            location: landDetails.location,
            area: landDetails.area,
            price: web3.utils.fromWei(landDetails.price.toString(), 'ether'),
            forSale: landDetails.forSale,
            documentHash: landDetails.documentHash,
            metadata
          };
        });

        const myLands = await Promise.all(landPromises);
        setLands(myLands);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching my lands:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMyLands();
  }, [contract, accounts, web3]);

  if (loading) {
    return <div className="loading">Đang tải danh sách bất động sản của bạn...</div>;
  }

  if (error) {
    return <div className="error">Có lỗi xảy ra: {error}</div>;
  }

  if (!accounts || accounts.length === 0) {
    return <div className="not-connected">Vui lòng kết nối ví MetaMask để xem bất động sản của bạn</div>;
  }

  const LandCard = ({ land }) => (
    <div className="land-card">
      <div className="land-image">
        {land.metadata && land.metadata.image ? (
          <img
            src={land.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
            alt={`Land ${land.id}`}
          />
        ) : (
          <div className="image-placeholder">Không có hình ảnh</div>
        )}
      </div>

      <div className="land-info">
        <h3>{land.metadata?.name || `Bất động sản #${land.id}`}</h3>
        <p className="land-location">{land.location}</p>
        <p className="land-area"><strong>Diện tích:</strong> {land.area} m²</p>
        <p className="land-price"><strong>Giá:</strong> {land.price > 0 ? `${land.price} ETH` : 'Chưa thiết lập'}</p>
        <p className={`land-status ${land.forSale ? 'for-sale' : 'not-for-sale'}`}>
          {land.forSale ? 'Đang rao bán' : 'Không rao bán'}
        </p>
      </div>

      <div className="escrow-management">
        <h4>Quản lý đặt cọc</h4>
        <Link
          to={`/land/${land.id}/escrows`}
          className="manage-escrows-btn"
        >
          Xem danh sách đặt cọc
        </Link>
      </div>

      <Link to={`/land/${land.id}`} className="view-details-btn">Xem chi tiết</Link>
    </div>
  );

  return (
    <div className="my-lands">
      <h2>Bất động sản của tôi</h2>

      {lands.length === 0 ? (
        <div className="no-lands">
          <p>Bạn chưa sở hữu bất động sản nào</p>
          <Link to="/register" className="register-btn">Đăng ký bất động sản mới</Link>
        </div>
      ) : (
        <div className="lands-grid">
          {lands.map((land) => (
            <LandCard key={land.id} land={land} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyLands;