import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

function Dashboard({ web3, contract, accounts }) {
  const [landCount, setLandCount] = useState(0);
  const [recentLands, setRecentLands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (contract) {
        try {
          // Lấy thông tin tổng số bất động sản đã đăng ký
          const count = await contract.methods._tokenIds().call();
          setLandCount(count);

          // Lấy thông tin 5 bất động sản gần đây nhất
          const lands = [];
          let startIndex = Math.max(1, count - 4);

          for (let i = startIndex; i <= count; i++) {
            try {
              // Kiểm tra nếu tokenId tồn tại
              const exists = await contract.methods._exists(i).call();

              if (exists) {
                const landDetails = await contract.methods
                  .getLandDetails(i)
                  .call();
                lands.push({
                  id: i,
                  location: landDetails.location,
                  area: landDetails.area,
                  owner: landDetails.owner,
                  price: web3.utils.fromWei(
                    landDetails.price.toString(),
                    "ether"
                  ),
                  forSale: landDetails.forSale,
                });
              }
            } catch (err) {
              console.log(`Token ID ${i} might not exist`);
            }
          }

          setRecentLands(lands);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [contract, web3]);

  return (
    <div className="dashboard">
      <h2>Bảng điều khiển</h2>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Tổng số bất động sản</h3>
          <p className="stat-number">{loading ? "Đang tải..." : landCount}</p>
        </div>
        <div className="stat-card">
          <h3>Tài khoản đang hoạt động</h3>
          <p className="stat-number">
            {accounts && accounts.length > 0
              ? accounts[0].substring(0, 8) + "..."
              : "Chưa kết nối"}
          </p>
        </div>
      </div>

      <div className="recent-lands">
        <h3>Bất động sản gần đây</h3>
        {loading ? (
          <p>Đang tải dữ liệu...</p>
        ) : recentLands.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Vị trí</th>
                <th>Diện tích (m²)</th>
                <th>Chủ sở hữu</th>
                <th>Trạng thái</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {recentLands.map((land) => (
                <tr key={land.id}>
                  <td>{land.id}</td>
                  <td>{land.location}</td>
                  <td>{land.area}</td>
                  <td>{land.owner.substring(0, 8)}...</td>
                  <td>
                    {land.forSale
                      ? `Đang bán (${land.price} ETH)`
                      : "Không bán"}
                  </td>
                  <td>
                    <Link to={`/land/${land.id}`} className="view-btn">
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Chưa có bất động sản nào được đăng ký</p>
        )}
      </div>

      <div className="dashboard-actions">
        <Link to="/register" className="action-btn">
          Đăng ký bất động sản mới
        </Link>
        <Link to="/marketplace" className="action-btn">
          Khám phá thị trường
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
