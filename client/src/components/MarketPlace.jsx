import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './MarketPlace.css';

function MarketPlace({ web3, contract, accounts }) {
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    location: ''
  });

  useEffect(() => {
    const fetchMarketplaceLands = async () => {
      if (!contract) {
        setLoading(false);
        return;
      }

      try {
        console.log('Contract address:', contract._address);
        console.log('Contract methods:', Object.keys(contract.methods));

        const landsForSale = [];
        let currentId = 1;
        const MAX_ATTEMPTS = 100; // Giới hạn số lần thử để tránh vòng lặp vô hạn

        while (currentId <= MAX_ATTEMPTS) {
          try {
            console.log('Fetching land details for token ID:', currentId);
            const exists = await contract.methods.ownerOf(currentId).call();

            if (exists) {
              const landDetails = await contract.methods.getLandDetails(currentId).call();
              console.log('Land details received:', landDetails);

              // Nếu đất đang được rao bán, thêm vào danh sách
              if (landDetails.forSale) {
                // Lấy metadata từ IPFS nếu có
                let metadata = null;
                try {
                  const tokenURI = await contract.methods.tokenURI(currentId).call();
                  if (tokenURI) {
                    const ipfsHash = tokenURI.replace('ipfs://', '');
                    const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
                    metadata = await response.json();
                  }
                } catch (err) {
                  console.error(`Lỗi khi lấy metadata cho đất ${currentId}:`, err);
                }

                landsForSale.push({
                  id: landDetails.id,
                  location: landDetails.location,
                  area: landDetails.area,
                  owner: landDetails.owner,
                  price: web3.utils.fromWei(landDetails.price.toString(), 'ether'),
                  documentHash: landDetails.documentHash,
                  metadata
                });
              }
            }
          } catch (error) {
            // Nếu token không tồn tại (ownerOf throws error), bỏ qua và tiếp tục
            console.log(`Token ${currentId} không tồn tại hoặc có lỗi:`, error.message);
          }
          currentId++;
        }

        setLands(landsForSale);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách đất rao bán:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchMarketplaceLands();
  }, [contract, web3]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const applyFilters = (land) => {
    // Lọc theo giá
    if (filters.minPrice && parseFloat(land.price) < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && parseFloat(land.price) > parseFloat(filters.maxPrice)) {
      return false;
    }

    // Lọc theo diện tích
    if (filters.minArea && parseInt(land.area) < parseInt(filters.minArea)) {
      return false;
    }
    if (filters.maxArea && parseInt(land.area) > parseInt(filters.maxArea)) {
      return false;
    }

    // Lọc theo vị trí
    if (filters.location && !land.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }

    return true;
  };

  const filteredLands = lands.filter(applyFilters);

  if (loading) {
    return <div className="loading">Đang tải thị trường bất động sản...</div>;
  }

  if (error) {
    return <div className="error">Có lỗi xảy ra: {error}</div>;
  }

  return (
    <div className="marketplace">
      <h2>Thị trường bất động sản</h2>

      <div className="filters">
        <h3>Bộ lọc</h3>
        <div className="filter-group">
          <div className="filter-item">
            <label htmlFor="minPrice">Giá thấp nhất (ETH)</label>
            <input
              type="number"
              id="minPrice"
              name="minPrice"
              value={filters.minPrice}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="filter-item">
            <label htmlFor="maxPrice">Giá cao nhất (ETH)</label>
            <input
              type="number"
              id="maxPrice"
              name="maxPrice"
              value={filters.maxPrice}
              onChange={handleFilterChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="filter-item">
            <label htmlFor="minArea">Diện tích nhỏ nhất (m²)</label>
            <input
              type="number"
              id="minArea"
              name="minArea"
              value={filters.minArea}
              onChange={handleFilterChange}
              min="0"
            />
          </div>

          <div className="filter-item">
            <label htmlFor="maxArea">Diện tích lớn nhất (m²)</label>
            <input
              type="number"
              id="maxArea"
              name="maxArea"
              value={filters.maxArea}
              onChange={handleFilterChange}
              min="0"
            />
          </div>

          <div className="filter-item full-width">
            <label htmlFor="location">Vị trí</label>
            <input
              type="text"
              id="location"
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              placeholder="Nhập vị trí tìm kiếm..."
            />
          </div>
        </div>
      </div>

      {filteredLands.length === 0 ? (
        <div className="no-lands">
          <p>Không có bất động sản nào đang rao bán phù hợp với bộ lọc</p>
        </div>
      ) : (
        <div className="lands-grid">
          {filteredLands.map((land) => (
            <div key={land.id} className="land-card">
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
                <p className="land-price"><strong>Giá:</strong> {land.price} ETH</p>
                <p className="land-owner"><strong>Chủ sở hữu:</strong> {land.owner.substring(0, 6)}...{land.owner.substring(land.owner.length - 4)}</p>
              </div>

              <div className="land-actions">
                <Link to={`/land/${land.id}`} className="view-details-btn">Xem chi tiết</Link>

                {accounts && accounts[0] && accounts[0].toLowerCase() !== land.owner.toLowerCase() && (
                  <Link to={`/land/${land.id}`} className="buy-btn">Mua ngay</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarketPlace;