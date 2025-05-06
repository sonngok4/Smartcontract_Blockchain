import { create } from 'ipfs-http-client';

// Kết nối với IPFS node công khai (cân nhắc sử dụng Infura hoặc Pinata trong môi trường thực)
const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' });

// Upload file lên IPFS
const uploadFileToIPFS = async (file) => {
  try {
    const added = await ipfs.add(file);
    return added.path;
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw error;
  }
};

// Upload metadata lên IPFS
const uploadMetadataToIPFS = async (metadata) => {
  try {
    const metadataString = JSON.stringify(metadata);
    const added = await ipfs.add(metadataString);
    return added.path;
  } catch (error) {
    console.error('Error uploading metadata to IPFS:', error);
    throw error;
  }
};

export { uploadFileToIPFS, uploadMetadataToIPFS };