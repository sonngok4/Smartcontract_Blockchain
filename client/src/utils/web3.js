import Web3 from 'web3';
import EscrowContract from '../../../build/contracts/EscrowContract.json';
import LandRegistry from '../../../build/contracts/LandRegistry.json';

// Environment detection
const isDevelopment = import.meta.env.VITE_NODE_ENV === 'development';

// Network configurations
const NETWORKS = {
	development: {
		chainId: '0x539', // 1337 in hex
		name: 'Ganache',
		rpcUrl: 'http://localhost:7545',
		nativeCurrency: {
			name: 'ETH',
			symbol: 'ETH',
			decimals: 18
		}
	},
	production: {
		chainId: '0xaa36a7', // 11155111 in hex
		name: 'Sepolia',
		rpcUrl: `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`,
		nativeCurrency: {
			name: 'SepoliaETH',
			symbol: 'SepoliaETH',
			decimals: 18
		}
	}
};

// Get current network configuration
const getNetworkConfig = () => {
	return isDevelopment ? NETWORKS.development : NETWORKS.production;
};

let web3;

const initWeb3 = async () => {
	if (window.ethereum) {
		try {
			// Request account access
			await window.ethereum.request({ method: 'eth_requestAccounts' });

			// Get current chain ID
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			const currentNetwork = getNetworkConfig();

			// Check if we're on the correct network
			if (chainId !== currentNetwork.chainId) {
				// Try to switch to the correct network
				try {
					await window.ethereum.request({
						method: 'wallet_switchEthereumChain',
						params: [{ chainId: currentNetwork.chainId }],
					});
				} catch (switchError) {
					// If the network doesn't exist, add it
					if (switchError.code === 4902) {
						try {
							await window.ethereum.request({
								method: 'wallet_addEthereumChain',
								params: [
									{
										chainId: currentNetwork.chainId,
										chainName: currentNetwork.name,
										rpcUrls: [currentNetwork.rpcUrl],
										nativeCurrency: currentNetwork.nativeCurrency
									},
								],
							});
						} catch (addError) {
							console.error('Error adding network:', addError);
							return null;
						}
					} else {
						console.error('Error switching network:', switchError);
						return null;
					}
				}
			}

			return new Web3(window.ethereum);
		} catch (error) {
			console.error('User denied account access or network error:', error);
			return null;
		}
	} else if (window.web3) {
		return new Web3(window.web3.currentProvider);
	} else {
		console.log(
			'Non-Ethereum browser detected. You should consider trying MetaMask!',
		);
		return null;
	}
};

const initContract = async () => {
	try {
		const web3 = await initWeb3();
		if (!web3) return null;

		const networkId = await web3.eth.net.getId();
		const deployedNetwork = LandRegistry.networks[networkId];

		if (!deployedNetwork) {
			throw new Error(
				`Contract not deployed to detected network (ID: ${networkId})`,
			);
		}

		return new web3.eth.Contract(LandRegistry.abi, deployedNetwork.address);
	} catch (error) {
		console.error('Error initializing contract:', error);
		return null;
	}
};

const initEscrowContract = async () => {
	try {
		const web3 = await initWeb3();
		if (!web3) return null;

		const networkId = await web3.eth.net.getId();
		const deployedNetwork = EscrowContract.networks[networkId];

		if (!deployedNetwork) {
			throw new Error(
				`Escrow contract not deployed to detected network (ID: ${networkId})`,
			);
		}

		return new web3.eth.Contract(EscrowContract.abi, deployedNetwork.address);
	} catch (error) {
		console.error('Error initializing escrow contract:', error);
		return null;
	}
};

const getAccounts = async () => {
	try {
		const web3 = await initWeb3();
		if (!web3) return [];
		return await web3.eth.getAccounts();
	} catch (error) {
		console.error('Error getting accounts:', error);
		return [];
	}
};

// Helper function to get current network info
const getCurrentNetwork = async () => {
	try {
		const web3 = await initWeb3();
		if (!web3) return null;

		const chainId = await web3.eth.getChainId();
		return chainId === 1337 ? 'development' : 'production';
	} catch (error) {
		console.error('Error getting network info:', error);
		return null;
	}
};

export {
	getAccounts,
	getCurrentNetwork, getNetworkConfig, initContract,
	initEscrowContract,
	initWeb3, isDevelopment, NETWORKS,
	web3
};

