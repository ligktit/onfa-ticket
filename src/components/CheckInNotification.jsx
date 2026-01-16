import React from "react";
import { CheckCircle, X } from "lucide-react";
import { getTierName } from "../utils/config";

const CheckInNotification = ({ ticket, onClose }) => {
  if (!ticket) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border-2 border-yellow-400 max-w-md w-full p-6" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-2">
              <CheckCircle className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-bold text-yellow-400">
              Check-in Thành công!
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ticket Info */}
        <div className="bg-white/10 rounded-lg p-4 space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Mã vé:</span>
            <span className="text-white font-mono font-bold">{ticket.ticketId}</span>
          </div>
          <div className="border-t border-white/20 pt-2 mt-2">
            <p className="text-white font-semibold text-lg mb-1">{ticket.name}</p>
            <p className="text-gray-300 text-sm">{ticket.email}</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <span className="text-gray-300 text-sm">Số điện thoại:</span>
            <span className="text-white">{ticket.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm">Ngày sinh:</span>
            <span className="text-white">{ticket.dob}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <span className="text-gray-300 text-sm">Hạng vé:</span>
            <span
              className={`px-3 py-1 rounded text-sm font-semibold ${
                ticket.tier === "supervip"
                  ? "bg-yellow-600 text-white"
                  : ticket.tier === "vvip"
                  ? "bg-yellow-500 text-black"
                  : "bg-yellow-400 text-black"
              }`}
            >
              {getTierName(ticket.tier)}
            </span>
          </div>
        </div>

        {/* Payment Image */}
        {ticket.paymentImage && (
          <div className="mb-4">
            <p className="text-white text-sm font-semibold mb-2">Ảnh xác thực:</p>
            <img
              src={ticket.paymentImage}
              alt="Payment proof"
              className="w-full rounded-lg border border-white/30 max-h-48 object-cover"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInNotification;
