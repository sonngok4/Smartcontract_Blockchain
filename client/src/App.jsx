import React, { useEffect, useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import LandDetails from './components/LandDetails';
import MarketPlace from './components/MarketPlace';
import MyLands from './components/MyLands';
import RegisterLand from './components/RegisterLand';
import { getAccounts, initContract, initWeb3 } from './utils/web3';

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Web3
        const web3Instance = await initWeb3();
        if (!web3Instance) {
          throw new Error('Failed to initialize Web3. Please check your MetaMask connection.');
        }
        setWeb3(web3Instance);

        // Get network information
        const network = await web3Instance.eth.net.getId();
        setNetworkId(network);
        console.log('Connected to network:', network);

        // Initialize contract
        const contractInstance = await initContract();
        if (!contractInstance || !contractInstance.methods) {
          throw new Error(`Contract not initialized. Please make sure you're connected to the correct network (Current network: ${network})`);
        }
        console.log('Contract address:', contractInstance._address);
        setContract(contractInstance);

        // Get accounts
        const accs = await getAccounts();
        if (!accs || accs.length === 0) {
          throw new Error('No accounts found. Please connect your MetaMask wallet.');
        }
        setAccounts(accs);
        console.log('Connected account:', accs[0]);

        // Listen for account changes
        if (window.ethereum) {
          window.ethereum.on('accountsChanged', async (newAccounts) => {
            console.log('Account changed:', newAccounts[0]);
            setAccounts(newAccounts);
          });

          window.ethereum.on('chainChanged', (chainId) => {
            console.log('Network changed. Reloading...', chainId);
            window.location.reload();
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => { });
        window.ethereum.removeListener('chainChanged', () => { });
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <p>Đang tải ứng dụng...</p>
        <p>Vui lòng đảm bảo MetaMask đã được kết nối</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Đã xảy ra lỗi:</h2>
        <p>{error}</p>
        <p>Vui lòng:</p>
        <ul>
          <li>Kiểm tra MetaMask đã được cài đặt và kết nối</li>
          <li>Đảm bảo bạn đang kết nối đúng mạng (network)</li>
          <li>Thử làm mới trang</li>
        </ul>
      </div>
    );
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
            <p>Mạng: {networkId ? `ID: ${networkId}` : 'Chưa kết nối'}</p>
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