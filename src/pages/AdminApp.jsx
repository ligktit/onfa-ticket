import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, AlertCircle, LogOut, Scan, Search, Filter } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { BackendAPI } from "../utils/api";
import { TIER_CONFIG, getTierName } from "../utils/config";
import StatCard from "../components/StatCard";

const AdminApp = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("checkin"); // "checkin" or "dashboard"
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [stats, setStats] = useState({
    vvipCount: 0,
    vipCount: 0,
    vvipLimit: 0,
    vipLimit: 0,
    vvipRemaining: 0,
    vipRemaining: 0,
    totalRegistered: 0,
    totalCheckedIn: 0,
  });
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, PENDING, PAID, CHECKED_IN, CANCELLED
  const [filterTier, setFilterTier] = useState("ALL"); // ALL, vvip, vip
  const qrCodeRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    navigate("/admin/login");
  };

  // Hàm load dữ liệu từ Server
  const loadData = async () => {
    try {
      const data = await BackendAPI.fetchData();
      if (data) {
        setStats(data.stats);
        setTickets(data.tickets);
        setConnectionError(""); // Clear error nếu load thành công
      } else {
        setConnectionError("Lỗi kết nối tới server, không load được dữ liệu");
      }
    } catch (error) {
      console.error("Lỗi load data:", error);
      setConnectionError("Lỗi kết nối tới server, không load được dữ liệu");
    }
  };

  // Filter và search tickets
  useEffect(() => {
    let filtered = [...tickets];

    // Filter by status
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Filter by tier
    if (filterTier !== "ALL") {
      filtered = filtered.filter((t) => t.tier === filterTier);
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          t.email.toLowerCase().includes(query) ||
          t.phone.toLowerCase().includes(query)
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, searchQuery, filterStatus, filterTier]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto refresh 5s
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Initialize filteredTickets when tickets change
  useEffect(() => {
    setFilteredTickets(tickets);
  }, [tickets]);

  // Cleanup QR scanner when view changes or component unmounts
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, [view]);

  // QR Scanner functions
  const startQRScanner = async () => {
    try {
      setError("");
      setIsScanning(true);
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR code scanned successfully
          setScanInput(decodedText);
          stopQRScanner();
          handleScanWithId(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
    } catch (err) {
      setError("Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập camera.");
      setIsScanning(false);
    }
  };

  const stopQRScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // Ignore cleanup errors
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanWithId = async (ticketId) => {
    setError("");
    try {
      const ticket = await BackendAPI.checkIn(ticketId.trim());
      setScanResult(ticket);
      setScanInput("");
      loadData();
    } catch (err) {
      setError(err.message);
      setScanResult(null);
    }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) {
      setError("Vui lòng nhập mã vé hoặc quét QR code");
      return;
    }
    await handleScanWithId(scanInput.trim());
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await BackendAPI.updateTicketStatus(ticketId, newStatus);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans">
      <div className="container mx-auto px-4 sm:px-6 max-w-[1200px] py-4 sm:py-6 md:py-8">
        <div className="text-center mb-6 sm:mb-8 relative">
          <button
            onClick={handleLogout}
            className="absolute top-0 right-0 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="hidden sm:inline">Đăng xuất</span>
            <span className="sm:hidden">X</span>
          </button>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-yellow-400 mb-2 px-8 sm:px-0">🔐 ADMIN PANEL</h1>
          <p className="text-yellow-300 text-sm sm:text-base md:text-lg">Hệ thống quản lý vé sự kiện</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 flex-wrap">
          <button
            onClick={() => setView("checkin")}
            className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold transition flex items-center text-sm sm:text-base ${
              view === "checkin"
                ? "bg-yellow-500 text-black"
                : "bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-400"
            }`}
          >
            <Camera size={18} className="sm:w-5 sm:h-5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Check-in</span><span className="sm:hidden">Check-in</span>
          </button>
          <button
            onClick={() => setView("dashboard")}
            className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold transition flex items-center text-sm sm:text-base ${
              view === "dashboard"
                ? "bg-yellow-500 text-black"
                : "bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-yellow-400"
            }`}
          >
            Dashboard
          </button>
        </div>

        {/* Connection Error Alert */}
        {connectionError && (
          <div className="mb-4 sm:mb-6 bg-red-500/20 border-2 border-red-500 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle size={20} className="flex-shrink-0" />
              <p className="text-sm sm:text-base font-semibold">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="VIP A Còn lại"
            value={`${stats.vvipRemaining}/${stats.vvipLimit || 0}`}
            color="yellow"
          />
          <StatCard
            label="VIP B Còn lại"
            value={`${stats.vipRemaining}/${stats.vipLimit || 0}`}
            color="blue"
          />
          <StatCard
            label="Đã đăng ký"
            value={stats.totalRegistered}
            color="green"
          />
          <StatCard
            label="Đã check-in"
            value={stats.totalCheckedIn}
            color="purple"
          />
        </div>

        {/* Main Views */}
        <div className="transition-all">
          {view === "checkin" && (
            <div className="bg-gray-800/90 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-yellow-400 mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-4 sm:mb-6 text-center">
                Check-in
              </h2>
              {error && (
                <div className="bg-red-500/20 text-red-100 p-2 sm:p-3 rounded mb-3 sm:mb-4 border border-red-500/50 text-center text-sm sm:text-base">
                  {error}
                </div>
              )}

              {/* QR Scanner */}
              {isScanning && (
                <div className="mb-4 sm:mb-6">
                  <div className="bg-black rounded-lg p-2 sm:p-4 mb-3 sm:mb-4 relative">
                    <div id="qr-reader" className="w-full"></div>
                    <button
                      onClick={stopQRScanner}
                      className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded hover:bg-red-600 text-xs sm:text-sm"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Input */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleScan()}
                  placeholder="Nhập mã vé hoặc quét QR code..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-gray-700 border border-yellow-400 text-white placeholder-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                />
                <div className="flex gap-2">
                  <button
                    onClick={isScanning ? stopQRScanner : startQRScanner}
                    className={`px-3 sm:px-4 md:px-6 rounded-lg transition flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
                      isScanning
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-yellow-500 hover:bg-yellow-400 text-black"
                    } text-white py-2 sm:py-3`}
                  >
                    <Scan size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">{isScanning ? "Dừng" : "Quét QR"}</span>
                    <span className="sm:hidden">{isScanning ? "Dừng" : "QR"}</span>
                  </button>
                  <button
                    onClick={handleScan}
                    className="px-3 sm:px-4 md:px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base py-2 sm:py-3"
                  >
                    <span className="hidden sm:inline">Check-in</span>
                    <span className="sm:hidden">✓</span>
                  </button>
                </div>
              </div>

              {scanResult && (
                <div className="bg-green-500/20 border border-green-400 rounded-lg p-6">
                  <div className="flex justify-center mb-4">
                    <CheckCircle size={48} className="text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white text-center mb-4">
                    Check-in Thành công!
                  </h3>
                  <div className="bg-white/10 rounded p-4 text-white space-y-2">
                    <p>
                      <strong>ID:</strong> {scanResult.id}
                    </p>
                    <p>
                      <strong>Tên:</strong> {scanResult.name}
                    </p>
                    <p>
                      <strong>Hạng:</strong> {getTierName(scanResult.tier)}
                    </p>
                    <p>
                      <strong>Ngày sinh:</strong> {scanResult.dob}
                    </p>
                  </div>
                  {scanResult.paymentImage && (
                    <div className="mt-4">
                      <p className="text-white text-sm font-bold mb-2">
                        Ảnh xác thực:
                      </p>
                      <img
                        src={scanResult.paymentImage}
                        alt="proof"
                        className="w-full rounded border border-white/30"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === "dashboard" && (
            <div className="bg-gray-800/90 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-yellow-400">
              <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-4 sm:mb-6 text-center">
                Admin Dashboard
              </h2>

              {/* Search and Filter */}
              <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                  {/* Search */}
                  <div className="flex-1 w-full sm:min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-yellow-400" size={18} />
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 bg-gray-700 border border-yellow-400 rounded-lg text-white placeholder-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Filter Status */}
                  <div className="flex items-center gap-2">
                    <Filter className="text-yellow-400 hidden sm:block" size={18} />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-700 border border-yellow-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                    >
                      <option value="ALL">Tất cả</option>
                      <option value="PENDING">Chờ CK</option>
                      <option value="PAID">Đã thanh toán</option>
                      <option value="CHECKED_IN">Đã vào</option>
                      <option value="CANCELLED">Hủy</option>
                    </select>
                  </div>

                  {/* Filter Tier */}
                  <select
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="px-3 sm:px-4 py-2 bg-gray-700 border border-yellow-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm sm:text-base"
                  >
                    <option value="ALL">Tất cả hạng</option>
                    <option value="vvip">VIP A</option>
                    <option value="vip">VIP B</option>
                  </select>
                </div>

                <div className="text-yellow-300 text-xs sm:text-sm">
                  Hiển thị: {filteredTickets.length} / {tickets.length} vé
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-left text-white">
                    <thead className="border-b border-yellow-400">
                      <tr>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm">ID</th>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm">Tên / Email</th>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm hidden sm:table-cell">SĐT / DOB</th>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm">Hạng</th>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm">Ảnh</th>
                        <th className="p-2 sm:p-3 text-yellow-400 text-xs sm:text-sm">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-4 sm:p-6 text-center text-gray-400 text-sm">
                            Không tìm thấy vé nào
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-white/10 hover:bg-white/5"
                        >
                          <td className="p-2 sm:p-3 font-mono text-xs sm:text-sm break-all">{t.id}</td>
                          <td className="p-2 sm:p-3">
                            <div className="font-bold text-xs sm:text-sm">{t.name}</div>
                            <div className="text-xs text-gray-300 break-all">{t.email}</div>
                            <div className="text-xs text-gray-400 sm:hidden mt-1">{t.phone} • {t.dob}</div>
                          </td>
                          <td className="p-2 sm:p-3 hidden sm:table-cell">
                            <div className="text-sm">{t.phone}</div>
                            <div className="text-xs text-gray-300">{t.dob}</div>
                          </td>
                          <td className="p-2 sm:p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                t.tier === "vvip"
                                  ? "bg-yellow-500 text-black"
                                  : "bg-yellow-400 text-black"
                              }`}
                            >
                              {getTierName(t.tier)}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3">
                            {t.paymentImage ? (
                              <div className="flex items-center gap-1 sm:gap-2">
                                <img
                                  src={t.paymentImage}
                                  alt="Payment"
                                  className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded border border-yellow-400 cursor-pointer hover:opacity-80 transition"
                                  onClick={() => setSelectedImage(t.paymentImage)}
                                />
                                <button
                                  onClick={() => setSelectedImage(t.paymentImage)}
                                  className="text-yellow-400 underline text-xs hover:text-yellow-300 transition hidden sm:inline"
                                >
                                  Xem
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs sm:text-sm">-</span>
                            )}
                          </td>
                          <td className="p-2 sm:p-3">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleStatusChange(t.id, e.target.value)
                              }
                              className="bg-gray-700 text-white text-xs sm:text-sm rounded px-1 sm:px-2 py-1 border border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                            >
                              <option value="PENDING" className="text-white">
                                Chờ CK
                              </option>
                              <option value="PAID" className="text-white">
                                Đã thanh toán
                              </option>
                              <option value="CHECKED_IN" className="text-white">
                                Đã vào
                              </option>
                              <option value="CANCELLED" className="text-white">
                                Hủy
                              </option>
                            </select>
                          </td>
                        </tr>
                      ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition z-10"
            >
              ✕
            </button>
            <div className="p-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Hình ảnh thanh toán
              </h3>
              <img
                src={selectedImage}
                alt="Payment proof"
                className="w-full h-auto rounded-lg border border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="mt-4 flex gap-2">
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  Mở trong tab mới
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApp;
