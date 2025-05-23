import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './MarketPlace.css';
import toast from 'react-hot-toast';

function MarketPlace({ web3, contract, accounts }) {
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    location: ''
  });
  const [depositPercentage] = useState(10); // Mặc định 10% giá trị bất động sản

  const TOKENS_PER_PAGE = 10;

  useEffect(() => {
    const fetchMarketplaceLands = async () => {
      if (!contract) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const startId = (currentPage - 1) * TOKENS_PER_PAGE + 1;
        const endId = startId + TOKENS_PER_PAGE - 1;

        const landsForDeposit = [];
        const processedIds = new Set();

        for (let currentId = startId; currentId <= endId; currentId++) {
          try {
            const owner = await contract.methods.ownerOf(currentId).call();

            if (owner && owner !== '0x0000000000000000000000000000000000000000' && !processedIds.has(currentId)) {
              const landDetails = await contract.methods.getLandDetails(currentId).call();

              if (landDetails.forSale) {
                processedIds.add(currentId);
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

                landsForDeposit.push({
                  id: currentId,
                  location: landDetails.location,
                  area: landDetails.area,
                  owner: landDetails.owner,
                  price: web3.utils.fromWei(landDetails.price.toString(), 'ether'),
                  documentHash: landDetails.documentHash,
                  metadata
                });
              }
            }
          } catch (err) {
            // console.log(`Token ${currentId} không tồn tại hoặc có lỗi:`, err.message);
            continue;
          }
        }

        try {
          const nextOwner = await contract.methods.ownerOf(endId + 1).call();
          setHasMore(nextOwner && nextOwner !== '0x0000000000000000000000000000000000000000');
        } catch {
          setHasMore(false);
        }

        setLands(prevLands => {
          const existingIds = new Set(prevLands.map(land => land.id));
          const newLands = landsForDeposit.filter(land => !existingIds.has(land.id));
          return [...prevLands, ...newLands];
        });

        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách đất cho đặt cọc:', err);
        setError(err.message);
        setLoading(false);
        toast.error('Có lỗi xảy ra khi tải danh sách bất động sản. Vui lòng thử lại sau.');
      }
    };

    fetchMarketplaceLands();
  }, [contract, web3, currentPage]);

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const applyFilters = (land) => {
    if (filters.minPrice && parseFloat(land.price) < parseFloat(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && parseFloat(land.price) > parseFloat(filters.maxPrice)) {
      return false;
    }
    if (filters.minArea && parseInt(land.area) < parseInt(filters.minArea)) {
      return false;
    }
    if (filters.maxArea && parseInt(land.area) > parseInt(filters.maxArea)) {
      return false;
    }
    if (filters.location && !land.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    return true;
  };

  const filteredLands = lands.filter(applyFilters);

  if (loading && currentPage === 1) {
    return <div className="loading">Đang tải danh sách bất động sản cho đặt cọc...</div>;
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
            <label htmlFor="minPrice">Giá rao bán thấp nhất (ETH)</label>
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
            <label htmlFor="maxPrice">Giá rao bán cao nhất (ETH)</label>
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
          <p>Không có bất động sản nào đang mở cho đặt cọc phù hợp với bộ lọc</p>
        </div>
      ) : (
        <>
          <div className="lands-grid">
            {filteredLands.map((land) => {
              const suggestedDeposit = (parseFloat(land.price) * depositPercentage / 100).toFixed(4);
              return (
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
                    <p className="land-price"><strong>Giá rao bán:</strong> {land.price} ETH</p>
                    <p className="land-deposit">
                      <strong>Đặt cọc tối thiểu:</strong> {suggestedDeposit} ETH ({depositPercentage}%)
                    </p>
                    <p className="land-owner">
                      <strong>Chủ sở hữu:</strong> {land.owner.substring(0, 6)}...{land.owner.substring(land.owner.length - 4)}
                    </p>
                  </div>

                  <div className="land-actions">
                    <Link to={`/land/${land.id}`} className="view-details-btn">Xem chi tiết</Link>
                    {accounts && accounts[0] && accounts[0].toLowerCase() !== land.owner.toLowerCase() && (
                      <Link to={`/land/${land.id}`} className="deposit-btn">Đặt cọc</Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && !loading && (
            <div className="load-more-container">
              <button
                className="load-more-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Đang tải...' : 'Tải thêm'}
              </button>
            </div>
          )}

          {loading && currentPage > 1 && (
            <div className="loading">Đang tải thêm bất động sản...</div>
          )}
        </>
      )}
    </div>
  );
}

export default MarketPlace;