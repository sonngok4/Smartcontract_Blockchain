// EscrowAgreementService.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { uploadFileToIPFS } from './ipfsService';

class EscrowAgreementService {
    constructor(web3, contractInstance) {
        this.web3 = web3;
        this.contractInstance = contractInstance;
    }

    /**
     * Tạo mẫu hợp đồng đặt cọc
     * @param {object} escrowData - Thông tin đặt cọc
     * @param {object} landData - Thông tin bất động sản
     * @param {object} buyerData - Thông tin người mua
     * @param {object} sellerData - Thông tin người bán
     * @returns {Promise<Blob>} - File PDF của hợp đồng
     */
    async generateAgreement(escrowData, landData, buyerData, sellerData) {
        const doc = new jsPDF();

        // Tiêu đề
        doc.setFontSize(18);
        doc.text('HỢP ĐỒNG ĐẶT CỌC BẤT ĐỘNG SẢN', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Mã hợp đồng: #${escrowData.escrowId}`, 105, 30, { align: 'center' });
        doc.text(`Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 105, 35, { align: 'center' });

        // Thông tin các bên
        doc.setFontSize(14);
        doc.text('THÔNG TIN CÁC BÊN', 14, 45);
        doc.setFontSize(12);

        // Bên A (Bên bán)
        doc.text('BÊN A (BÊN BÁN):', 14, 55);
        doc.text(`Địa chỉ ví: ${sellerData.walletAddress}`, 14, 60);
        if (sellerData.fullName) doc.text(`Họ và tên: ${sellerData.fullName}`, 14, 65);
        if (sellerData.identityNumber) doc.text(`Số CMND/CCCD: ${sellerData.identityNumber}`, 14, 70);
        if (sellerData.contactInfo) doc.text(`Thông tin liên hệ: ${sellerData.contactInfo}`, 14, 75);

        // Bên B (Bên mua)
        doc.text('BÊN B (BÊN MUA):', 14, 85);
        doc.text(`Địa chỉ ví: ${buyerData.walletAddress}`, 14, 90);
        if (buyerData.fullName) doc.text(`Họ và tên: ${buyerData.fullName}`, 14, 95);
        if (buyerData.identityNumber) doc.text(`Số CMND/CCCD: ${buyerData.identityNumber}`, 14, 100);
        if (buyerData.contactInfo) doc.text(`Thông tin liên hệ: ${buyerData.contactInfo}`, 14, 105);

        // Thông tin bất động sản
        doc.setFontSize(14);
        doc.text('THÔNG TIN BẤT ĐỘNG SẢN', 14, 115);
        doc.setFontSize(12);
        doc.text(`Mã bất động sản: #${landData.id}`, 14, 125);
        doc.text(`Vị trí: ${landData.location}`, 14, 130);
        doc.text(`Diện tích: ${landData.area} m²`, 14, 135);
        if (landData.documentHash) {
            doc.text(`Giấy tờ pháp lý: https://ipfs.io/ipfs/${landData.documentHash}`, 14, 140);
        }

        // Thông tin đặt cọc
        doc.setFontSize(14);
        doc.text('THÔNG TIN ĐẶT CỌC', 14, 150);
        doc.setFontSize(12);
        doc.text(`Số tiền đặt cọc: ${this.web3.utils.fromWei(escrowData.amount.toString(), 'ether')} ETH`, 14, 160);
        doc.text(`Thời hạn đặt cọc: ${new Date(escrowData.deadline * 1000).toLocaleDateString('vi-VN')}`, 14, 165);
        doc.text(`Mục đích đặt cọc: Đảm bảo quyền mua bất động sản`, 14, 170);

        // Các điều khoản và điều kiện
        doc.setFontSize(14);
        doc.text('ĐIỀU KHOẢN VÀ ĐIỀU KIỆN', 14, 180);
        doc.setFontSize(12);

        const terms = [
            '1. BÊN B đặt cọc cho BÊN A để đảm bảo quyền mua bất động sản nêu trên.',
            '2. Trong thời hạn hiệu lực của hợp đồng đặt cọc, BÊN A không được phép chào bán bất động sản cho bên thứ ba.',
            '3. Nếu BÊN B từ chối mua bất động sản mà không có lý do chính đáng, BÊN B sẽ mất tiền đặt cọc.',
            '4. Nếu BÊN A từ chối bán bất động sản mà không có lý do chính đáng, BÊN A phải hoàn trả cho BÊN B số tiền đặt cọc.',
            '5. Trường hợp hai bên thỏa thuận chấm dứt hợp đồng, BÊN A sẽ hoàn trả tiền đặt cọc cho BÊN B.',
            '6. Hợp đồng này được lập thành 02 bản điện tử, có giá trị như nhau.',
            '7. Hợp đồng này được thực hiện theo quy định của Bộ luật Dân sự 2015 và các quy định pháp luật hiện hành.',
            '8. Mọi tranh chấp phát sinh từ hợp đồng này sẽ được giải quyết thông qua thương lượng hoặc tại Tòa án có thẩm quyền.',
        ];

        // Thêm các điều khoản
        let yPos = 190;
        terms.forEach(term => {
            doc.text(term, 14, yPos);
            yPos += 6;
        });

        // Thêm thêm một trang mới nếu cần
        doc.addPage();

        // Cam kết của các bên
        doc.setFontSize(14);
        doc.text('CAM KẾT CỦA CÁC BÊN', 14, 20);
        doc.setFontSize(12);

        const commitments = [
            '1. BÊN A cam kết bất động sản nêu trên thuộc quyền sở hữu hợp pháp của mình, không có tranh chấp, không bị kê biên.',
            '2. BÊN B cam kết có đủ khả năng tài chính để thực hiện giao dịch mua bán bất động sản.',
            '3. Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng này.'
        ];

        // Thêm các cam kết
        yPos = 30;
        commitments.forEach(commitment => {
            doc.text(commitment, 14, yPos);
            yPos += 6;
        });

        // Chữ ký của các bên
        doc.setFontSize(14);
        doc.text('CHỮ KÝ CỦA CÁC BÊN', 14, 55);
        doc.setFontSize(12);

        // Thêm chữ ký bằng địa chỉ ví
        doc.text('BÊN A (BÊN BÁN):', 35, 70);
        doc.text(`Địa chỉ ví: ${sellerData.walletAddress}`, 35, 80);

        doc.text('BÊN B (BÊN MUA):', 35, 100);
        doc.text(`Địa chỉ ví: ${buyerData.walletAddress}`, 35, 110);

        // Thêm mã QR
        try {
            const qrCanvas = document.createElement('canvas');
            await QRCode.toCanvas(qrCanvas, `https://dapp.example.com/escrow/${escrowData.escrowId}`, { width: 150 });
            const qrCode = qrCanvas.toDataURL('image/png');
            doc.addImage(qrCode, 'PNG', 150, 60, 40, 40);
            doc.text('Quét mã QR để xác thực hợp đồng', 150, 105, { align: 'center' });
        } catch (error) {
            console.error('Failed to generate QR code:', error);
        }

        // Thêm chữ ký số của dApp
        doc.text('Hợp đồng này được tạo và xác thực bởi dApp Quản lý Quyền sở hữu BĐS', 14, 130);
        doc.text(`Mã xác thực: ${this.generateVerificationCode(escrowData.escrowId)}`, 14, 140);
        doc.text(`Xác thực tại: https://dapp.example.com/verify/${escrowData.escrowId}`, 14, 145);

        return doc.output('blob');
    }

    /**
     * Tạo mã xác thực cho hợp đồng
     * @param {string} escrowId - ID của đặt cọc
     * @returns {string} - Mã xác thực
     */
    generateVerificationCode(escrowId) {
        const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        return `${dateString}-${escrowId}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    }

    /**
     * Tải hợp đồng lên IPFS
     * @param {Blob} pdfBlob - File PDF của hợp đồng
     * @returns {Promise<string>} - IPFS hash của hợp đồng
     */
    async uploadAgreementToIPFS(pdfBlob) {
        try {
            // Chuyển đổi Blob thành File
            const file = new File([pdfBlob], 'escrow-agreement.pdf', { type: 'application/pdf' });

            // Tải lên IPFS
            const ipfsHash = await uploadFileToIPFS(file);
            return ipfsHash;
        } catch (error) {
            console.error('Error uploading agreement to IPFS:', error);
            throw error;
        }
    }

    /**
     * Tạo và tải hợp đồng đặt cọc lên IPFS
     * @param {object} escrowData - Thông tin đặt cọc
     * @param {object} landData - Thông tin bất động sản
     * @param {object} buyerData - Thông tin người mua
     * @param {object} sellerData - Thông tin người bán
     * @returns {Promise<string>} - IPFS hash của hợp đồng
     */
    async createAndUploadAgreement(escrowData, landData, buyerData, sellerData) {
        const pdfBlob = await this.generateAgreement(escrowData, landData, buyerData, sellerData);
        const ipfsHash = await this.uploadAgreementToIPFS(pdfBlob);
        return ipfsHash;
    }
}

export default EscrowAgreementService;