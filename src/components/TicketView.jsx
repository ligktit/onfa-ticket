import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import { getTierName } from "../utils/config";

const TicketView = ({ ticket, onClose }) => {
  const ticketRef = useRef(null);
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
      // Đợi một chút để đảm bảo QR code canvas được render đầy đủ
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        // Đảm bảo capture cả canvas elements (QR code)
        onclone: (clonedDoc) => {
          // Tìm tất cả canvas elements và đảm bảo chúng được render
          const canvases = clonedDoc.querySelectorAll('canvas');
          canvases.forEach(canvas => {
            // Đảm bảo canvas có style display block
            canvas.style.display = 'block';
          });
        },
      });

      const link = document.createElement("a");
      link.download = `ONFA_Ticket_${ticket.id}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (error) {
      console.error("Lỗi khi lưu vé:", error);
      alert("Không thể lưu vé. Vui lòng thử lại!");
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
