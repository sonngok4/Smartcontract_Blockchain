require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

const { MNEMONIC, INFURA_PROJECT_ID, ALCHEMY_API_KEY } = process.env;

module.exports = {
	networks: {
		// Development network (Ganache)
		development: {
			host: '127.0.0.1',
			port: 7545,
			network_id: '*',
			gas: 6721975,
			gasPrice: 20000000000,
		},
		ganache: {
			host: "127.0.0.1",
			port: 7545,
			network_id: "*"
		},
		// Sepolia with Infura (kept as reference)
		infura_sepolia: {
			provider: () => {
				if (!MNEMONIC || !INFURA_PROJECT_ID) {
					throw new Error(
						'Please set MNEMONIC and INFURA_PROJECT_ID in your .env file',
					);
				}
				return new HDWalletProvider({
					mnemonic: MNEMONIC,
					providerOrUrl: `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`,
					addressIndex: 0,
					numberOfAddresses: 1,
					shareNonce: true,
					derivationPath: "m/44'/60'/0'/0/",
					pollingInterval: 15000,
				});
			},
			network_id: 11155111,
			gas: 5000000,
			gasPrice: 20000000000,
			confirmations: 2,
			timeoutBlocks: 200,
			skipDryRun: true,
			networkCheckTimeout: 120000,
		},
		// Sepolia with Alchemy
		sepolia: {
			provider: () => {
				if (!MNEMONIC || !ALCHEMY_API_KEY) {
					throw new Error(
						'Please set MNEMONIC and ALCHEMY_API_KEY in your .env file',
					);
				}
				return new HDWalletProvider({
					mnemonic: MNEMONIC,
					providerOrUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
					addressIndex: 0,
					numberOfAddresses: 1,
					shareNonce: true,
					derivationPath: "m/44'/60'/0'/0/",
					pollingInterval: 15000,
				});
			},
			network_id: 11155111,
			gas: 5000000,
			gasPrice: 20000000000, // 20 gwei
			confirmations: 2,
			timeoutBlocks: 200,
			skipDryRun: true,
			networkCheckTimeout: 120000,
		},
		coverage: {
			host: 'localhost',
			network_id: '*',
			port: 8555,
			gas: 0xfffffffffff,
			gasPrice: 0x01
		}
	},

	// Set default mocha options here, use special reporters, etc.
	mocha: {
		timeout: 100000
	},

	// Configure your compilers
	compilers: {
		solc: {
			version: '0.8.21', // Fetch exact version from solc-bin (default: truffle's version)
			settings: {
				optimizer: {
					enabled: true,
					runs: 200,
				},
				viaIR: true, // Enable IR-based codegen
				evmVersion: 'byzantium',
			},
		},
	},
	plugins: ["solidity-coverage"],
};