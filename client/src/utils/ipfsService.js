import axios from 'axios';
import FormData from 'form-data';

// Pinata configuration
const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

console.log('PINATA_API_KEY', PINATA_API_KEY);
console.log('PINATA_SECRET_KEY', PINATA_SECRET_KEY);


// Upload file lên IPFS
const uploadFileToIPFS = async (file) => {
	try {
		if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
			throw new Error('Pinata credentials are missing. Please check your .env file.');
		}

		const formData = new FormData();
		formData.append('file', file);

		const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
			headers: {
				'Content-Type': 'multipart/form-data',
				'pinata_api_key': PINATA_API_KEY,
				'pinata_secret_api_key': PINATA_SECRET_KEY
			}
		});

		return response.data.IpfsHash;
	} catch (error) {
		console.error('Error uploading file to IPFS:', error);
		throw error;
	}
};

// Upload metadata lên IPFS
const uploadMetadataToIPFS = async (metadata) => {
	try {
		if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
			throw new Error('Pinata credentials are missing. Please check your .env file.');
		}

		const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
			headers: {
				'Content-Type': 'application/json',
				'pinata_api_key': PINATA_API_KEY,
				'pinata_secret_api_key': PINATA_SECRET_KEY
			}
		});

		return response.data.IpfsHash;
	} catch (error) {
		console.error('Error uploading metadata to IPFS:', error);
		throw error;
	}
};

export { uploadFileToIPFS, uploadMetadataToIPFS };

