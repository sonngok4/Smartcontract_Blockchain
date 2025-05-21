import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFileToIPFS, uploadMetadataToIPFS } from '../utils/ipfsService.js';
import './RegisterLand.css';
import toast from 'react-hot-toast';

function RegisterLand({ contract, accounts }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    location: '',
    area: '',
    documentTitle: '',
    description: ''
  });
  const [landImage, setLandImage] = useState(null);
  const [landDoc, setLandDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleImageChange = (e) => {
    setLandImage(e.target.files[0]);
  };

  const handleDocChange = (e) => {
    setLandDoc(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!accounts || accounts.length === 0) {
        throw new Error('Không có tài khoản nào được kết nối');
      }

      // Upload hình ảnh lên IPFS
      let imageHash = '';
      if (landImage) {
        imageHash = await uploadFileToIPFS(landImage);
      }

      // Upload tài liệu lên IPFS
      let docHash = '';
      if (landDoc) {
        docHash = await uploadFileToIPFS(landDoc);
      }

      // Tạo metadata
      const metadata = {
        name: `Land at ${formData.location}`,
        description: formData.description,
        image: `ipfs://${imageHash}`,
        attributes: [
          {
            trait_type: "Location",
            value: formData.location
          },
          {
            trait_type: "Area",
            value: formData.area
          },
          {
            trait_type: "Document Title",
            value: formData.documentTitle
          }
        ]
      };

      // Upload metadata lên IPFS
      const metadataHash = await uploadMetadataToIPFS(metadata);
      const tokenURI = `ipfs://${metadataHash}`;

      // Convert area to number
      const area = Number(formData.area);

      // Estimate gas for the transaction
      const gasEstimate = await contract.methods
        .registerLand(
          formData.location,
          area,
          docHash,
          tokenURI
        )
        .estimateGas({ from: accounts[0] });

      // Convert gas estimate to number and add 20% buffer
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

      // Đăng ký bất động sản trên blockchain với gas limit đã tính
      const result = await contract.methods
        .registerLand(
          formData.location,
          area,
          docHash,
          tokenURI
        )
        .send({
          from: accounts[0],
          gas: gasLimit
        });

      // Lấy ID của bất động sản vừa đăng ký
      const landId = result.events.LandRegistered.returnValues.tokenId;

      toast.success('Đăng ký bất động sản thành công!', {
        duration: 2000,
        style: {
          background: '#4caf50',
          color: '#fff',
          fontSize: '16px',
          padding: '10px',
          borderRadius: '5px',
          textAlign: 'center',
        },
      });
      setSuccess(`Đăng ký bất động sản thành công với ID: ${landId}`);

      // Chuyển hướng đến trang chi tiết bất động sản sau khi đăng ký thành công
      setTimeout(() => {
        navigate(`/land/${landId}`);
      }, 2000);

    } catch (err) {
      console.error('Error registering land:', err);
      if (err.message.includes('out of gas')) {
        setError('Giao dịch không thành công do không đủ gas. Vui lòng thử lại với gas limit cao hơn.');
      } else if (err.message.includes('BigInt')) {
        setError('Lỗi chuyển đổi kiểu dữ liệu. Vui lòng kiểm tra lại thông tin nhập vào.');
      } else {
        setError(err.message || 'Đã xảy ra lỗi khi đăng ký bất động sản');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-land">
      <h2>Đăng ký bất động sản mới</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="location">Vị trí (địa chỉ đầy đủ)</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="area">Diện tích (m²)</label>
          <input
            type="number"
            id="area"
            min={10}
            step={0.01}
            name="area"
            value={formData.area}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="documentTitle">Tiêu đề giấy tờ</label>
          <input
            type="text"
            id="documentTitle"
            name="documentTitle"
            value={formData.documentTitle}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Mô tả</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
          ></textarea>
        </div>

        <div className="form-group">
          <label htmlFor="landImage">Hình ảnh bất động sản</label>
          <input
            type="file"
            id="landImage"
            accept="image/*"
            onChange={handleImageChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="landDoc">Tài liệu pháp lý (PDF)</label>
          <input
            type="file"
            id="landDoc"
            accept=".pdf,.doc,.docx"
            onChange={handleDocChange}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Đăng ký bất động sản'}
        </button>
      </form>
    </div>
  );
}

export default RegisterLand;