import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { getTierName } from "../utils/config";

const TicketView = ({ ticket, onClose }) => {
  const ticketRef = useRef(null);
  const qrCodeRef = useRef(null);
  const [qrSize, setQrSize] = useState(180);

  useEffect(() => {
    const updateQrSize = () => {
      if (window.innerWidth < 640) {
        setQrSize(140);
      } else if (window.innerWidth < 768) {
        setQrSize(160);
      } else {
        setQrSize(180);
      }
    };

    updateQrSize();
    window.addEventListener("resize", updateQrSize);
    return () => window.removeEventListener("resize", updateQrSize);
  }, []);

  const handleDownload = async () => {
    if (!ticketRef.current) return;

    try {
      // Lấy kích thước của vé
      const rect = ticketRef.current.getBoundingClientRect();
      const ticketWidth = rect.width;
      const ticketHeight = rect.height;

      // Đợi một chút để đảm bảo QR code canvas được render đầy đủ
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture vé thành canvas để convert QR code canvas thành image
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc, element) => {
          const canvases = clonedDoc.querySelectorAll('canvas');
          canvases.forEach((canvasEl) => {
            try {
              const imageDataUrl = canvasEl.toDataURL('image/png');
              const img = clonedDoc.createElement('img');
              img.src = imageDataUrl;
              img.width = canvasEl.width;
              img.height = canvasEl.height;
              img.style.width = canvasEl.width + 'px';
              img.style.height = canvasEl.height + 'px';
              img.style.display = 'block';
              if (canvasEl.parentNode) {
                canvasEl.parentNode.replaceChild(img, canvasEl);
              }
            } catch (err) {
              console.error('Error converting canvas to image:', err);
            }
          });
        },
      });

      // Lấy image data URL từ canvas
      const imageDataUrl = canvas.toDataURL("image/png", 1.0);

      // Tạo HTML cho cửa sổ popup với kích thước chính xác bằng vé
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>ONFA Ticket - ${ticket.id}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #000;
                padding: 20px;
              }
              .ticket-container {
                max-width: 100%;
                max-height: 100vh;
              }
              .ticket-image {
                width: 100%;
                height: auto;
                display: block;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
              }
              .instructions {
                color: #fff;
                text-align: center;
                margin-top: 15px;
                font-family: Arial, sans-serif;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="ticket-container">
              <img src="${imageDataUrl}" alt="ONFA Ticket" class="ticket-image" />
              <div class="instructions">
                Nhấn Ctrl+S (Windows) hoặc Cmd+S (Mac) để lưu hình ảnh
              </div>
            </div>
          </body>
        </html>
      `;

      // Tạo blob URL từ HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Mở cửa sổ popup với kích thước chính xác bằng vé + một chút padding cho UI
      const popupWidth = Math.min(ticketWidth + 100, window.screen.width - 100);
      const popupHeight = Math.min(ticketHeight + 150, window.screen.height - 100);
      const left = (window.screen.width - popupWidth) / 2;
      const top = (window.screen.height - popupHeight) / 2;

      const popup = window.open(
        url,
        'ONFA_Ticket',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Cleanup blob URL sau khi popup đóng
      if (popup) {
        popup.addEventListener('beforeunload', () => {
          URL.revokeObjectURL(url);
        });
      }
    } catch (error) {
      console.error("Lỗi khi mở vé:", error);
      alert("Không thể mở vé. Vui lòng thử lại!");
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 min-h-screen py-4 sm:py-6 md:py-8 px-4">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-400 mb-4 sm:mb-6">Vé của bạn</h2>
        <div
          ref={ticketRef}
          className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl text-left"
        >
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-3 sm:py-4 px-4 sm:px-6 rounded-t-xl -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 md:-mt-8 mb-4 sm:mb-6 text-center border-2 border-yellow-400">
            <h3 className="text-2xl sm:text-3xl font-bold">ONFA 2026</h3>
            <p className="text-xs sm:text-sm font-semibold">
              Vé {getTierName(ticket.tier)}
            </p>
          </div>
          <div className="mb-4 sm:mb-6 text-center">
            <div className="bg-white p-3 sm:p-4 rounded-lg inline-block border-2 border-gray-800">
              {/* Sử dụng Canvas cho việc capture tốt hơn */}
              <QRCodeCanvas
                ref={qrCodeRef}
                value={ticket.id}
                size={qrSize}
                level="H"
                includeMargin={true}
                style={{ display: 'block' }}
              />
            </div>
            <div className="mt-3 sm:mt-4 text-lg sm:text-xl font-mono font-bold text-gray-900 break-all px-2">
              {ticket.id}
            </div>
            <p className="text-xs text-gray-600 mt-2">Quét mã QR để check-in</p>
          </div>
          <div className="space-y-2 bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm text-gray-800 border border-gray-200">
            <p>
              <strong>Tên:</strong> {ticket.name}
            </p>
            <p>
              <strong>SĐT:</strong> {ticket.phone}
            </p>
            <p>
              <strong>DOB:</strong> {ticket.dob}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 sm:mt-6 justify-center">
          <button
            onClick={handleDownload}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
          >
            <Download size={18} className="sm:w-5 sm:h-5" />
            Lưu vé về máy
          </button>
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition text-sm sm:text-base"
          >
            Đăng ký vé khác
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketView;
