// EscrowAgreementService.js
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// Import các font hỗ trợ tiếng Việt cho jsPDF
import 'jspdf-font';

class EscrowAgreementService {
	constructor(web3, contractInstance) {
		this.web3 = web3;
		this.contractInstance = contractInstance;
		this.initializeFont();
	}

	initializeFont() {
		// Sử dụng font chuẩn của jsPDF
		this.defaultFont = 'helvetica';
	}

	// Helper function để xử lý text tiếng Việt
	normalizeVietnameseText(text) {
		if (!text) return '';

		// Bảng chuyển đổi tiếng Việt có dấu sang không dấu
		const vietnameseMap = {
			à: 'a',
			á: 'a',
			ạ: 'a',
			ả: 'a',
			ã: 'a',
			â: 'a',
			ầ: 'a',
			ấ: 'a',
			ậ: 'a',
			ẩ: 'a',
			ẫ: 'a',
			ă: 'a',
			ằ: 'a',
			ắ: 'a',
			ặ: 'a',
			ẳ: 'a',
			ẵ: 'a',
			è: 'e',
			é: 'e',
			ẹ: 'e',
			ẻ: 'e',
			ẽ: 'e',
			ê: 'e',
			ề: 'e',
			ế: 'e',
			ệ: 'e',
			ể: 'e',
			ễ: 'e',
			ì: 'i',
			í: 'i',
			ị: 'i',
			ỉ: 'i',
			ĩ: 'i',
			ò: 'o',
			ó: 'o',
			ọ: 'o',
			ỏ: 'o',
			õ: 'o',
			ô: 'o',
			ồ: 'o',
			ố: 'o',
			ộ: 'o',
			ổ: 'o',
			ỗ: 'o',
			ơ: 'o',
			ờ: 'o',
			ớ: 'o',
			ợ: 'o',
			ở: 'o',
			ỡ: 'o',
			ù: 'u',
			ú: 'u',
			ụ: 'u',
			ủ: 'u',
			ũ: 'u',
			ư: 'u',
			ừ: 'u',
			ứ: 'u',
			ự: 'u',
			ử: 'u',
			ữ: 'u',
			ỳ: 'y',
			ý: 'y',
			ỵ: 'y',
			ỷ: 'y',
			ỹ: 'y',
			đ: 'd',
			À: 'A',
			Á: 'A',
			Ạ: 'A',
			Ả: 'A',
			Ã: 'A',
			Â: 'A',
			Ầ: 'A',
			Ấ: 'A',
			Ậ: 'A',
			Ẩ: 'A',
			Ẫ: 'A',
			Ă: 'A',
			Ằ: 'A',
			Ắ: 'A',
			Ặ: 'A',
			Ẳ: 'A',
			Ẵ: 'A',
			È: 'E',
			É: 'E',
			Ẹ: 'E',
			Ẻ: 'E',
			Ẽ: 'E',
			Ê: 'E',
			Ề: 'E',
			Ế: 'E',
			Ệ: 'E',
			Ể: 'E',
			Ễ: 'E',
			Ì: 'I',
			Í: 'I',
			Ị: 'I',
			Ỉ: 'I',
			Ĩ: 'I',
			Ò: 'O',
			Ó: 'O',
			Ọ: 'O',
			Ỏ: 'O',
			Õ: 'O',
			Ô: 'O',
			Ồ: 'O',
			Ố: 'O',
			Ộ: 'O',
			Ổ: 'O',
			Ỗ: 'O',
			Ơ: 'O',
			Ờ: 'O',
			Ớ: 'O',
			Ợ: 'O',
			Ở: 'O',
			Ỡ: 'O',
			Ù: 'U',
			Ú: 'U',
			Ụ: 'U',
			Ủ: 'U',
			Ũ: 'U',
			Ư: 'U',
			Ừ: 'U',
			Ứ: 'U',
			Ự: 'U',
			Ử: 'U',
			Ữ: 'U',
			Ỳ: 'Y',
			Ý: 'Y',
			Ỵ: 'Y',
			Ỷ: 'Y',
			Ỹ: 'Y',
			Đ: 'D',
		};

		return text.split('').map(char => vietnameseMap[char] || char).join('');
	}

	// Helper function để tạo style cho text
	setTextStyle(doc, { size = 12, style = 'normal' } = {}) {
		doc.setFontSize(size);
		if (style === 'bold') {
			doc.setFont(this.defaultFont, 'bold');
		} else if (style === 'italic') {
			doc.setFont(this.defaultFont, 'italic');
		} else if (style === 'bolditalic') {
			doc.setFont(this.defaultFont, 'bolditalic');
		} else {
			doc.setFont(this.defaultFont, 'normal');
		}
	}

	// Helper function để căn giữa text
	drawCenteredText(doc, text, y, fontSize = 12) {
		const normalizedText = this.normalizeVietnameseText(text);
		this.setTextStyle(doc, { size: fontSize });
		const pageWidth = doc.internal.pageSize.getWidth();
		const textWidth =
			doc.getStringUnitWidth(normalizedText) *
			fontSize /
			doc.internal.scaleFactor;
		const x = (pageWidth - textWidth) / 2;
		doc.text(normalizedText, x, y);
	}

	// Helper function để vẽ text với padding
	drawText(doc, text, x, y, options = {}) {
		const { fontSize = 12, style = 'normal', align = 'left' } = options;
		const normalizedText = this.normalizeVietnameseText(text);

		this.setTextStyle(doc, { size: fontSize, style });

		if (align === 'center') {
			this.drawCenteredText(doc, normalizedText, y, fontSize);
		} else {
			doc.text(normalizedText, x, y);
		}
	}

	/**
	 * Chuyển số thành chữ tiếng Việt
	 * @param {number} number - Số cần chuyển
	 * @returns {string} - Chuỗi chữ tiếng Việt
	 */
	convertNumberToVietnameseWords(number) {
		const units = [
			'',
			'mot',
			'hai',
			'ba',
			'bon',
			'nam',
			'sau',
			'bay',
			'tam',
			'chin',
		];
		const positions = ['', 'muoi', 'tram', 'nghin', 'trieu', 'ty'];

		if (number === 0) return 'khong';

		const numberStr = Math.floor(number).toString();
		let result = '';

		for (let i = 0; i < numberStr.length; i++) {
			const digit = parseInt(numberStr[i]);
			const position = numberStr.length - i - 1;

			if (digit !== 0) {
				result += units[digit] + ' ' + positions[position] + ' ';
			}
		}

		return result.trim();
	}

	/**
	 * Tạo mã xác thực cho hợp đồng
	 * @param {string} escrowId - ID của giao dịch đặt cọc
	 * @returns {string} - Mã xác thực
	 * @private
	 */
	generateVerificationCode(escrowId) {
		// Tạo mã xác thực dựa trên escrowId và timestamp
		const timestamp = Date.now();
		const baseString = `${escrowId}-${timestamp}`;

		// Tạo hash từ chuỗi gốc sử dụng Web3
		const hash = this.web3.utils.sha3(baseString);

		// Lấy 8 ký tự đầu của hash làm mã xác thực
		return hash.substring(2, 10).toUpperCase();
	}

	/**
	 * Tạo mẫu hợp đồng đặt cọc
	 * @param {object} escrowData - Thông tin đặt cọc
	 * @param {object} landData - Thông tin bất động sản
	 * @param {object} buyerData - Thông tin người mua
	 * @param {object} sellerData - Thông tin người bán
	 * @param {string} format - Định dạng output ('pdf' hoặc 'html')
	 * @param {boolean} isNewAgreement - Kiểm tra xem đây có phải là hợp đồng mới hay không
	 * @returns {Promise<Object>} - File hợp đồng và metadata
	 */
	async generateAgreement(
		escrowData,
		landData,
		buyerData,
		sellerData,
		format = 'pdf',
		isNewAgreement = true,
	) {
		// Kiểm tra thông tin bắt buộc theo luật Việt Nam
		this.validateRequiredInformation(buyerData, sellerData, isNewAgreement);

		// Tính toán các giá trị cần thiết
		const today = new Date();
		const formattedDate = this.formatVietnameseDate(today);
		const deadline = new Date(Number(escrowData.deadline) * 1000);
		const formattedDeadline = this.formatVietnameseDate(deadline);

		// Chuyển đổi số tiền - đảm bảo xử lý cả trường hợp string và BigInt
		const depositAmountETH = this.web3.utils.fromWei(
			escrowData.amount.toString(),
			'ether',
		);
		const depositAmountInWords = this.convertNumberToVietnameseWords(
			parseFloat(depositAmountETH),
		);

		// Tính phần trăm đặt cọc nếu có giá bất động sản
		let depositPercentage = '';
		if (landData.price) {
			const priceETH = this.web3.utils.fromWei(
				landData.price.toString(),
				'ether',
			);
			const percentage =
				parseFloat(depositAmountETH) / parseFloat(priceETH) * 100;
			depositPercentage = `(tương đương ${Math.round(
				percentage,
			)}% giá trị bất động sản)`;
		}

		// Tạo mã xác thực
		const verificationCode = this.generateVerificationCode(escrowData.escrowId);

		// Tạo metadata
		const agreementMetadata = this.createAgreementMetadata(
			escrowData,
			landData,
			buyerData,
			sellerData,
			today,
			deadline,
			verificationCode,
		);

		const formatData = {
			formattedDate,
			formattedDeadline,
			depositAmountETH,
			depositAmountInWords,
			depositPercentage,
			verificationCode,
		};

		// Tạo nội dung hợp đồng theo định dạng
		if (format === 'html') {
			return {
				content: this.generateHtmlAgreement(
					escrowData,
					landData,
					buyerData,
					sellerData,
					formatData,
				),
				metadata: agreementMetadata,
			};
		} else {
			return {
				content: await this.generatePdfAgreement(
					escrowData,
					landData,
					buyerData,
					sellerData,
					formatData,
				),
				metadata: agreementMetadata,
			};
		}
	}

	/**
	 * Kiểm tra thông tin bắt buộc theo luật Việt Nam
	 */
	validateRequiredInformation(buyerData, sellerData, isNewAgreement = true) {
		// Nếu là hợp đồng mới, yêu cầu đầy đủ thông tin
		if (isNewAgreement) {
			const requiredFields = ['fullName', 'identityNumber', 'address'];

			for (const field of requiredFields) {
				if (!buyerData[field]) {
					throw new Error(`Thiếu thông tin bắt buộc của người mua: ${field}`);
				}
			}

			if (!buyerData.phoneNumber && !buyerData.email) {
				throw new Error(
					'Cần ít nhất một thông tin liên hệ (số điện thoại hoặc email) của người mua',
				);
			}
		} else {
			// Nếu là hợp đồng đã tồn tại, chỉ yêu cầu địa chỉ ví
			if (!buyerData.walletAddress) {
				throw new Error('Thiếu địa chỉ ví của người mua');
			}
			if (!sellerData.walletAddress) {
				throw new Error('Thiếu địa chỉ ví của người bán');
			}
		}
	}

	/**
	 * Định dạng ngày tháng theo tiếng Việt
	 */
	formatVietnameseDate(date) {
		return date.toLocaleDateString('vi-VN', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

	/**
	 * Tạo metadata cho hợp đồng
	 */
	createAgreementMetadata(
		escrowData,
		landData,
		buyerData,
		sellerData,
		createdDate,
		deadline,
		verificationCode,
	) {
		return {
			escrowId: escrowData.escrowId,
			landId: landData.id,
			buyer: {
				walletAddress: buyerData.walletAddress,
				fullName: buyerData.fullName,
				identityNumber: buyerData.identityNumber,
			},
			seller: {
				walletAddress: sellerData.walletAddress,
				fullName: sellerData.fullName || '',
				identityNumber: sellerData.identityNumber || '',
			},
			depositAmount: this.web3.utils.fromWei(
				escrowData.amount.toString(),
				'ether',
			),
			createdAt: createdDate.toISOString(),
			expiresAt: deadline.toISOString(),
			verificationCode: verificationCode,
			version: '1.0',
			legalCompliance:
				'Tuân thủ Bộ luật Dân sự 2015 và các quy định về giao dịch BĐS',
		};
	}

	/**
	 * Tạo hợp đồng PDF
	 * @private
	 */
	async generatePdfAgreement(
		escrowData,
		landData,
		buyerData,
		sellerData,
		formatData,
	) {
		// Tạo tài liệu PDF với encoding UTF-8
		const doc = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4',
			compress: true,
			putOnlyUsedFonts: true,
			hotfixes: ['px_scaling'],
		});

		// Thêm font Unicode để hỗ trợ tiếng Việt nếu có thể
		try {
			// Thêm font NotoSans hỗ trợ Unicode nếu có
			if (typeof doc.addFont === 'function') {
				await this.addUnicodeFont(doc);
			}
		} catch (error) {
			console.warn('Unicode font addition failed, using default font:', error);
		}

		// Thiết lập metadata cho PDF
		doc.setProperties({
			title: `Hợp đồng đặt cọc #${escrowData.escrowId}`,
			subject: 'Hợp đồng đặt cọc bất động sản',
			author: 'DApp Quản lý Quyền sở hữu BĐS',
			keywords: 'hợp đồng, đặt cọc, bất động sản, blockchain',
			creator: 'DApp Quản lý Quyền sở hữu BĐS',
		});

		// Vẽ tiêu đề
		this.drawText(doc, 'HỢP ĐỒNG ĐẶT CỌC BẤT ĐỘNG SẢN', 0, 20, {
			fontSize: 18,
			style: 'bold',
			align: 'center',
		});

		this.drawText(doc, `Mã hợp đồng: #${escrowData.escrowId}`, 0, 30, {
			fontSize: 12,
			align: 'center',
		});

		this.drawText(doc, `Ngày lập: ${formatData.formattedDate}`, 0, 35, {
			fontSize: 12,
			align: 'center',
		});

		// Thông tin các bên
		this.drawText(doc, 'THÔNG TIN CÁC BÊN', 14, 45, {
			fontSize: 14,
			style: 'bold',
		});

		// Bên A (Bên bán)
		this.drawText(doc, 'BÊN A (BÊN BÁN):', 14, 55);
		this.drawText(doc, `Địa chỉ ví: ${sellerData.walletAddress}`, 14, 60);
		if (sellerData.fullName) {
			this.drawText(doc, `Họ và tên: ${sellerData.fullName}`, 14, 65);
		}
		if (sellerData.identityNumber) {
			this.drawText(doc, `Số CMND/CCCD: ${sellerData.identityNumber}`, 14, 70);
		}
		if (sellerData.contactInfo) {
			this.drawText(
				doc,
				`Thông tin liên hệ: ${sellerData.contactInfo}`,
				14,
				75,
			);
		}

		// Bên B (Bên mua)
		this.drawText(doc, 'BÊN B (BÊN MUA):', 14, 85);
		this.drawText(doc, `Địa chỉ ví: ${buyerData.walletAddress}`, 14, 90);
		if (buyerData.fullName) {
			this.drawText(doc, `Họ và tên: ${buyerData.fullName}`, 14, 95);
		}
		if (buyerData.identityNumber) {
			this.drawText(doc, `Số CMND/CCCD: ${buyerData.identityNumber}`, 14, 100);
		}
		if (buyerData.contactInfo) {
			this.drawText(
				doc,
				`Thông tin liên hệ: ${buyerData.contactInfo}`,
				14,
				105,
			);
		}

		// Thông tin bất động sản
		this.drawText(doc, 'THÔNG TIN BẤT ĐỘNG SẢN', 14, 115, {
			fontSize: 14,
			style: 'bold',
		});
		this.drawText(doc, `Mã bất động sản: #${landData.id}`, 14, 125);
		this.drawText(doc, `Vị trí: ${landData.location}`, 14, 130);
		this.drawText(doc, `Diện tích: ${landData.area} m²`, 14, 135);
		if (landData.price) {
			this.drawText(
				doc,
				`Giá bất động sản: ${this.web3.utils.fromWei(
					landData.price.toString(),
					'ether',
				)} ETH`,
				14,
				140,
			);
		}
		if (landData.documentHash) {
			this.drawText(
				doc,
				`Giấy tờ pháp lý: https://ipfs.io/ipfs/${landData.documentHash}`,
				14,
				145,
			);
		}

		// Thông tin đặt cọc
		this.drawText(doc, 'THÔNG TIN ĐẶT CỌC', 14, 155, {
			fontSize: 14,
			style: 'bold',
		});
		this.drawText(
			doc,
			`Số tiền đặt cọc: ${formatData.depositAmountETH} ETH ${formatData.depositPercentage}`,
			14,
			165,
		);
		this.drawText(
			doc,
			`Thời hạn đặt cọc: ${formatData.formattedDeadline}`,
			14,
			170,
		);
		this.drawText(
			doc,
			`Mục đích đặt cọc: Đảm bảo quyền mua bất động sản`,
			14,
			175,
		);

		// Các điều khoản và điều kiện
		this.drawText(doc, 'ĐIỀU KHOẢN VÀ ĐIỀU KIỆN', 14, 185, {
			fontSize: 14,
			style: 'bold',
		});

		const terms = [
			'1. BÊN B đặt cọc cho BÊN A để đảm bảo quyền mua bất động sản nêu trên.',
			'2. Trong thời hạn hiệu lực của hợp đồng đặt cọc, BÊN A không được phép chào bán bất động sản cho bên thứ ba.',
			'3. Nếu BÊN B từ chối mua bất động sản mà không có lý do chính đáng, BÊN B sẽ mất tiền đặt cọc.',
			'4. Nếu BÊN A từ chối bán bất động sản mà không có lý do chính đáng, BÊN A phải hoàn trả cho BÊN B số tiền đặt cọc gấp đôi.',
			'5. Trường hợp hai bên thỏa thuận chấm dứt hợp đồng, BÊN A sẽ hoàn trả tiền đặt cọc cho BÊN B.',
			'6. Hợp đồng này được lập thành 02 bản điện tử, có giá trị như nhau.',
			'7. Hợp đồng này được thực hiện theo quy định của Bộ luật Dân sự 2015 và các quy định pháp luật hiện hành.',
			'8. Mọi tranh chấp phát sinh từ hợp đồng này sẽ được giải quyết thông qua thương lượng hoặc tại Tòa án có thẩm quyền.',
		];

		// Thêm các điều khoản
		doc.addPage();
		let yPos = 20;
		terms.forEach(term => {
			this.drawText(doc, term, 14, yPos);
			yPos += 8;
		});

		// Cam kết của các bên
		this.drawText(doc, 'CAM KẾT CỦA CÁC BÊN', 14, yPos, {
			fontSize: 14,
			style: 'bold',
		});
		yPos += 10;
		this.drawText(
			doc,
			'1. BÊN A cam kết bất động sản nêu trên thuộc quyền sở hữu hợp pháp của mình, không có tranh chấp, không bị kê biên.',
			14,
			yPos,
		);
		yPos += 8;
		this.drawText(
			doc,
			'2. BÊN B cam kết có đủ khả năng tài chính để thực hiện giao dịch mua bán bất động sản.',
			14,
			yPos,
		);
		yPos += 8;
		this.drawText(
			doc,
			'3. Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng này.',
			14,
			yPos,
		);

		// Chữ ký của các bên
		yPos += 10;
		this.drawText(doc, 'CHỮ KÝ CỦA CÁC BÊN', 14, yPos, {
			fontSize: 14,
			style: 'bold',
		});
		yPos += 10;
		this.drawText(doc, 'BÊN A (BÊN BÁN):', 35, yPos);
		yPos += 10;
		this.drawText(doc, `Địa chỉ ví: ${sellerData.walletAddress}`, 35, yPos);

		yPos += 20;
		this.drawText(doc, 'BÊN B (BÊN MUA):', 35, yPos);
		yPos += 10;
		this.drawText(doc, `Địa chỉ ví: ${buyerData.walletAddress}`, 35, yPos);

		// Thêm mã QR
		try {
			const qrCanvas = document.createElement('canvas');
			await QRCode.toCanvas(
				qrCanvas,
				`http://localhost:5173/escrow/${escrowData.escrowId}`,
				{ width: 150 },
			);
			const qrCode = qrCanvas.toDataURL('image/png');
			// Đặt QR code ở góc phải dưới của trang
			const pageHeight = doc.internal.pageSize.getHeight();
			const pageWidth = doc.internal.pageSize.getWidth();
			const qrSize = 30; // Kích thước QR code (mm)
			const margin = 15; // Khoảng cách từ mép (mm)

			doc.addImage(
				qrCode,
				'PNG',
				pageWidth - qrSize - margin, // X position
				pageHeight - qrSize - margin - 20, // Y position (thêm 20mm cho text bên dưới)
				qrSize, // Width
				qrSize, // Height
			);

			// Thêm text giải thích bên dưới QR code
			this.drawText(
				doc,
				'Quét mã QR để xác thực hợp đồng',
				pageWidth - qrSize - margin - 15,
				pageHeight - margin - 15,
				{
					fontSize: 10,
					align: 'left',
				},
			);
		} catch (error) {
			console.error('Failed to generate QR code:', error);
		}

		// Thêm chữ ký số của dApp
		yPos += 20;
		this.drawText(
			doc,
			'Hợp đồng này được tạo và xác thực bởi dApp Quản lý Quyền sở hữu BĐS',
			14,
			yPos,
		);
		yPos += 8;
		this.drawText(doc, `Mã xác thực: ${formatData.verificationCode}`, 14, yPos);
		yPos += 8;
		this.drawText(
			doc,
			`Xác thực tại: http://localhost:5173/verify/${escrowData.escrowId}`,
			14,
			yPos,
		);

		return doc.output('blob');
	}

	/**
	 * Thêm font Unicode hỗ trợ tiếng Việt vào PDF
	 * @param {jsPDF} doc - Đối tượng jsPDF
	 */
	async addUnicodeFont(doc) {
		try {
			// Sử dụng font mặc định của jsPDF
			doc.setFont(this.defaultFont);
		} catch (error) {
			console.warn('Could not set font:', error);
			// Fallback to default font
			doc.setFont('helvetica');
		}
	}

	/**
	 * Tạo hợp đồng HTML
	 * @private
	 */
	generateHtmlAgreement(
		escrowData,
		landData,
		buyerData,
		sellerData,
		formatData,
	) {
		if (!landData || !landData.price) {
			console.error('Invalid land data:', landData);
			throw new Error('Land data is missing or invalid');
		}

		const landPriceText = landData.price
			? parseFloat(
					this.web3.utils.fromWei(landData.price.toString(), 'ether'),
				).toLocaleString('vi-VN') + ' ETH'
			: 'Chưa xác định';

		return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hợp đồng đặt cọc</title>
            <style>
                /* Import Google font hỗ trợ tiếng Việt */
                @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Noto+Sans:wght@400;700&display=swap');
                
                body {
                    font-family: 'Noto Sans', 'Roboto', sans-serif;
                    line-height: 1.6;
					padding: 20px;
					margin: 0;
					color: #333;
					background-color: #f8f9fa;
				}
                    margin: 0 auto;
                    padding: 20px;
                }
                h1, h2, h3, h4 {
                    color: #2c3e50;
                }
                .signature-section {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 40px;
                }
                .signature-block {
                    text-align: center;
                    flex: 1;
                    margin: 0 20px;
                }
                .signature-line {
                    border-bottom: 1px solid #000;
                    margin: 20px 0;
                }
                .verification {
                    margin-top: 40px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 5px;
                }
            </style>
        </head>
        <body>
        <div class="deposit-agreement-preview">
          <h1>HỢP ĐỒNG ĐẶT CỌC QUYỀN MUA BẤT ĐỘNG SẢN</h1>
          
          <p>Hôm nay, ngày ${formatData.formattedDate}, chúng tôi gồm:</p>
          
          <h2>BÊN BÁN (Bên A):</h2>
          <p>Địa chỉ ví: ${sellerData.walletAddress}</p>
          ${sellerData.fullName
						? `<p>Họ và tên: ${sellerData.fullName}</p>`
						: ''}
          ${sellerData.identityNumber
						? `<p>Số CMND/CCCD: ${sellerData.identityNumber}</p>`
						: ''}
          ${sellerData.contactInfo
						? `<p>Thông tin liên hệ: ${sellerData.contactInfo}</p>`
						: ''}
          
          <h2>BÊN MUA (Bên B):</h2>
          <p>Địa chỉ ví: ${buyerData.walletAddress}</p>
          ${buyerData.fullName ? `<p>Họ và tên: ${buyerData.fullName}</p>` : ''}
          ${buyerData.identityNumber
						? `<p>Số CMND/CCCD: ${buyerData.identityNumber}</p>`
						: ''}
          ${buyerData.contactInfo
						? `<p>Thông tin liên hệ: ${buyerData.contactInfo}</p>`
						: ''}
          
          <h2>SAU KHI BÀN BẠC, THỎA THUẬN, HAI BÊN THỐNG NHẤT KÝ KẾT HỢP ĐỒNG ĐẶT CỌC VỚI CÁC ĐIỀU KHOẢN SAU:</h2>
          
          <h3>ĐIỀU 1: TÀI SẢN ĐẶT CỌC</h3>
          <p>1.1. Bên B đồng ý đặt cọc cho Bên A để đảm bảo việc mua bất động sản với các thông tin như sau:</p>
          <p>- Mã bất động sản: #${landData.id}</p>
          <p>- Vị trí: ${landData.location}</p>
          <p>- Diện tích: ${landData.area} m²</p>
          <p>- Giá bất động sản: ${landPriceText}</p>
          ${landData.documentHash
						? `<p>- Giấy tờ pháp lý: <a href="https://ipfs.io/ipfs/${landData.documentHash}" target="_blank">Xem tài liệu</a></p>`
						: ''}
          
          <h3>ĐIỀU 2: SỐ TIỀN ĐẶT CỌC</h3>
          <p>2.1. Số tiền đặt cọc: ${formatData.depositAmountETH} ETH</p>
          ${formatData.depositPercentage
						? `<p>2.2. Số tiền đặt cọc này ${formatData.depositPercentage}.</p>`
						: ''}
          <p>2.3. Số tiền đặt cọc sẽ được chuyển qua smart contract và được quản lý bởi hệ thống blockchain.</p>
          
          <h3>ĐIỀU 3: THỜI HẠN VÀ PHƯƠNG THỨC GIAO DỊCH</h3>
          <p>3.1. Thời hạn hiệu lực của hợp đồng đặt cọc: đến hết ngày ${formatData.formattedDeadline}.</p>
          <p>3.2. Trong thời hạn hiệu lực của hợp đồng đặt cọc, hai bên sẽ tiến hành các thủ tục pháp lý cần thiết để hoàn tất việc chuyển nhượng bất động sản theo quy định của pháp luật hiện hành.</p>
          
          <div class="signature-section">
            <div class="signature-block">
              <h4>BÊN BÁN (BÊN A)</h4>
              <p>(Ký và ghi rõ họ tên)</p>
              <div class="signature-line"></div>
              <p>${sellerData.walletAddress}</p>
            </div>
            
            <div class="signature-block">
              <h4>BÊN MUA (BÊN B)</h4>
              <p>(Ký và ghi rõ họ tên)</p>
              <div class="signature-line"></div>
              <p>${buyerData.walletAddress}</p>
            </div>
          </div>
          
          <div class="verification">
            <p>Hợp đồng này được tạo và xác thực bởi dApp Quản lý Quyền sở hữu BĐS</p>
            <p>Mã xác thực: ${formatData.verificationCode}</p>
            <p>Xác thực tại: <a href="http://localhost:5173/verify/${escrowData.escrowId}" target="_blank">http://localhost:5173/verify/${escrowData.escrowId}</a></p>
          </div>
        </div>
        </body>
        </html>`;
	}
}

export default EscrowAgreementService;
