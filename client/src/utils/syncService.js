class SyncService {
    constructor(web3, escrowContract) {
        this.web3 = web3;
        this.escrowContract = escrowContract;
    }

    // Kiểm tra dữ liệu từ IPFS
    async checkIPFSData(ipfsHash) {
        if (!ipfsHash) {
            console.log('No IPFS hash provided');
            return null;
        }

        try {
            // Sử dụng IPFS.io gateway
            const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`IPFS fetch failed: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                console.warn('IPFS data is not JSON format');
                return null;
            }
        } catch (error) {
            console.error('Error fetching IPFS data:', error);
            return null;
        }
    }

    // Kiểm tra dữ liệu từ blockchain
    async checkBlockchainData(escrowId) {
        try {
            const details = await this.escrowContract.methods.getEscrowDetails(escrowId).call();
            return details;
        } catch (error) {
            console.error('Error fetching blockchain data:', error);
            return null;
        }
    }

    // Đồng bộ dữ liệu
    async syncEscrowData(escrowId) {
        try {
            // 1. Kiểm tra dữ liệu blockchain
            const blockchainData = await this.escrowContract.methods.getEscrowDetails(escrowId).call();
            console.log('Blockchain Data:', blockchainData);

            // Kiểm tra nếu escrow không tồn tại
            if (!blockchainData || blockchainData.buyer === '0x0000000000000000000000000000000000000000') {
                throw new Error('Không tìm thấy hợp đồng đặt cọc này trên blockchain');
            }

            // 2. Kiểm tra dữ liệu IPFS
            let ipfsData = null;
            if (blockchainData.agreementHash) {
                ipfsData = await this.checkIPFSData(blockchainData.agreementHash);
                console.log('IPFS Data:', ipfsData);
            }

            // 3. Tạo metadata đồng bộ
            const syncMetadata = {
                escrowId: escrowId,
                blockchainData: {
                    buyer: blockchainData.buyer,
                    seller: blockchainData.seller,
                    amount: blockchainData.amount.toString(),
                    createdAt: blockchainData.createdAt.toString(),
                    deadline: blockchainData.deadline.toString(),
                    state: blockchainData.state
                },
                ipfsData: ipfsData,
                lastVerified: new Date().toISOString()
            };

            return {
                isSynced: true,
                blockchainData,
                ipfsData,
                syncMetadata
            };
        } catch (error) {
            console.error('Sync error:', error);
            return {
                isSynced: false,
                error: error.message
            };
        }
    }
}

export default SyncService;
