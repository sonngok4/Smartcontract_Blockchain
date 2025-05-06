import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { initWeb3, initContract, getAccounts } from './utils/web3';
import Dashboard from './components/Dashboard';
import RegisterLand from './components/RegisterLand';
import LandDetails from './components/LandDetails';
import MyLands from './components/MyLands';
import MarketPlace from './components/MarketPlace';
import './App.css';

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Khởi tạo Web3
        const web3Instance = await initWeb3();
        setWeb3(web3Instance);

        // Khởi tạo contract
        const contractInstance = await initContract();
        setContract(contractInstance);

        // Lấy danh sách tài khoản
        const accs = await getAccounts();
        setAccounts(accs);

        // Lắng nghe sự kiện thay đổi tài khoản từ MetaMask
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', async (newAccounts) => {
            setAccounts(newAccounts);
          });
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    // Cleanup function
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  if (loading) {
    return <div className="loading">Đang tải ứng dụng...</div>;
  }

  if (error) {
    return <div className="error">Lỗi: {error}</div>;
  }

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Hệ thống quản lý quyền sở hữu đất đai trên Blockchain</h1>
          <nav>
            <ul>
              <li><Link to="/">Trang chủ</Link></li>
              <li><Link to="/register">Đăng ký đất đai</Link></li>
              <li><Link to="/my-lands">Đất đai của tôi</Link></li>
              <li><Link to="/marketplace">Thị trường</Link></li>
            </ul>
          </nav>
          <div className="wallet-info">
            <p>Tài khoản: {accounts.length > 0 ? accounts[0] : 'Chưa kết nối'}</p>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard web3={web3} contract={contract} accounts={accounts} />} />
            <Route path="/register" element={<RegisterLand web3={web3} contract={contract} accounts={accounts} />} />
            <Route path="/land/:id" element={<LandDetails web3={web3} contract={contract} accounts={accounts} />} />
            <Route path="/my-lands" element={<MyLands web3={web3} contract={contract} accounts={accounts} />} />
            <Route path="/marketplace" element={<MarketPlace web3={web3} contract={contract} accounts={accounts} />} />
          </Routes>
        </main>

        <footer>
          <p>&copy; 2025 Hệ thống quản lý quyền sở hữu đất đai trên Blockchain</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;