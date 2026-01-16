import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, AlertCircle, LogOut, Scan, Search, Filter, Loader2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
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
  const loadData = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
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
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
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
    loadData(true); // Initial load với loading overlay
    const interval = setInterval(() => {
      loadData(false); // Auto refresh không hiển thị loading overlay
    }, 5000); // Auto refresh 5s
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
      loadData(false); // Refresh không hiển thị loading overlay
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
    loadData(false); // Refresh không hiển thị loading overlay
  };

  // Loading overlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md mx-4 border-2 border-yellow-400">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-yellow-400 mb-2">
            Đang kết nối với server...
          </h3>
          <p className="text-sm sm:text-base text-gray-300 text-center">
            Đang tải dữ liệu vé và thống kê, vui lòng đợi...
          </p>
          <div className="mt-6 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 font-sans relative">
      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}
      
      <div className={`container mx-auto px-4 sm:px-6 max-w-[1400px] py-4 sm:py-6 md:py-8 transition-all duration-300 ${
        isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}>
        {/* Header Card */}
        <div className="bg-gradient-to-br from-gray-800/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-yellow-400/60 shadow-2xl shadow-yellow-500/20 mb-6 sm:mb-8 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Main Header Content */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-2">
                <div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 bg-clip-text text-transparent mb-2">
                    ONFA TICKET ADMIN PANEL
                  </h1>
                </div>
              </div>
              <p className="text-yellow-300/90 text-base sm:text-lg md:text-xl font-medium">
                Hệ thống quản lý vé sự kiện
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 flex-wrap">
          <button
            onClick={() => setView("checkin")}
            className={`px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg ${
              view === "checkin"
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-yellow-500/50 scale-105"
                : "bg-gray-800/80 backdrop-blur-sm text-yellow-400 hover:bg-gray-700/80 border-2 border-yellow-400/50 hover:border-yellow-400 hover:scale-105"
            }`}
          >
            <Camera size={18} className="sm:w-5 sm:h-5" /> 
            <span>Check-in</span>
          </button>
          <button
            onClick={() => setView("dashboard")}
            className={`px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 text-sm sm:text-base shadow-lg ${
              view === "dashboard"
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-yellow-500/50 scale-105"
                : "bg-gray-800/80 backdrop-blur-sm text-yellow-400 hover:bg-gray-700/80 border-2 border-yellow-400/50 hover:border-yellow-400 hover:scale-105"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-3.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base font-semibold shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-105"
          >
            <LogOut size={18} className="sm:w-5 sm:h-5" />
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Connection Error Alert */}
        {connectionError && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-500/80 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-lg shadow-red-500/20">
            <div className="flex items-center gap-3 text-red-200">
              <AlertCircle size={22} className="flex-shrink-0 text-red-400" />
              <p className="text-sm sm:text-base font-semibold">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            label="Vé VIP Còn lại"
            value={`${stats.vvipRemaining}/${stats.vvipLimit || 0}`}
            color="yellow"
          />
          <StatCard
            label="Vé Superior Còn lại"
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
            <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-yellow-400/80 shadow-2xl shadow-yellow-500/10 mx-auto">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 bg-clip-text text-transparent mb-2">
                  Check-in
                </h2>
                <div className="h-1 w-24 sm:w-32 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full"></div>
              </div>
              {error && (
                <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-100 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 border-2 border-red-500/60 text-center text-sm sm:text-base backdrop-blur-sm shadow-lg shadow-red-500/20">
                  <div className="flex items-center justify-center gap-2">
                    <AlertCircle size={18} className="text-red-400" />
                    <span className="font-semibold">{error}</span>
                  </div>
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
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleScan()}
                  placeholder="Nhập mã vé hoặc quét QR code..."
                  className="flex-1 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl bg-gray-700/80 backdrop-blur-sm border-2 border-yellow-400/50 text-white placeholder-yellow-300/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base transition-all shadow-lg"
                />
                <div className="flex gap-3">
                  <button
                    onClick={isScanning ? stopQRScanner : startQRScanner}
                    className={`px-4 sm:px-6 md:px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-lg ${
                      isScanning
                        ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30"
                        : "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black shadow-yellow-500/30"
                    } py-3 sm:py-3.5 hover:scale-105`}
                  >
                    <Scan size={18} className="sm:w-5 sm:h-5" />
                    <span>{isScanning ? "Dừng" : "Quét QR"}</span>
                  </button>
                  <button
                    onClick={handleScan}
                    className="px-4 sm:px-6 md:px-8 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl hover:scale-105 transition-all duration-300 text-sm sm:text-base font-semibold shadow-lg shadow-green-500/30 py-3 sm:py-3.5"
                  >
                    <span>Check-in</span>
                  </button>
                </div>
              </div>

              {scanResult && (
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-400/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl shadow-green-500/20">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <CheckCircle size={64} className="text-green-400 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-green-400/20 rounded-full animate-ping"></div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent text-center mb-6">
                    Check-in Thành công!
                  </h3>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 sm:p-6 text-white space-y-3 border border-white/20">
                    <p className="flex items-center gap-2">
                      <strong className="text-green-400">ID:</strong> 
                      <span className="font-mono">{scanResult.id}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <strong className="text-green-400">Tên:</strong> 
                      <span>{scanResult.name}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <strong className="text-green-400">Hạng:</strong> 
                      <span>{getTierName(scanResult.tier)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <strong className="text-green-400">Ngày sinh:</strong> 
                      <span>{scanResult.dob}</span>
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
            <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border-2 border-yellow-400/80 shadow-2xl shadow-yellow-500/10">

              {/* Search and Filter */}
              <div className="mb-6 sm:mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  {/* Search */}
                  <div className="flex-1 w-full sm:min-w-[250px]">
                    <div className="relative">
                      <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-yellow-400" size={20} />
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-gray-700/80 backdrop-blur-sm border-2 border-yellow-400/50 rounded-xl text-white placeholder-yellow-300/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base shadow-lg transition-all"
                      />
                    </div>
                  </div>

                  {/* Filter Status */}
                  <div className="flex items-center gap-2">
                    <Filter className="text-yellow-400 hidden sm:block" size={20} />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex-1 sm:flex-none px-4 py-3 bg-gray-700/80 backdrop-blur-sm border-2 border-yellow-400/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base shadow-lg transition-all"
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
                    className="px-4 py-3 bg-gray-700/80 backdrop-blur-sm border-2 border-yellow-400/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm sm:text-base shadow-lg transition-all"
                  >
                    <option value="ALL">Tất cả hạng</option>
                    <option value="vvip">Vé VIP</option>
                    <option value="vip">Vé Superior</option>
                  </select>
                </div>

                <div className="text-yellow-300/90 text-sm sm:text-base font-medium flex items-center gap-2">
                  <span className="bg-yellow-400/20 px-3 py-1 rounded-lg border border-yellow-400/30">
                    Hiển thị: <span className="font-bold text-yellow-400">{filteredTickets.length}</span> / <span className="font-bold text-yellow-400">{tickets.length}</span> vé
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-xl border border-yellow-400/30">
                <div className="inline-block min-w-full align-middle">
                  <table className="w-full text-left text-white">
                    <thead className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-b-2 border-yellow-400/50">
                      <tr>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider">ID</th>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider">Tên / Email</th>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider hidden sm:table-cell">SĐT / DOB</th>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider">Hạng</th>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider">Ảnh</th>
                        <th className="p-3 sm:p-4 text-yellow-400 font-bold text-xs sm:text-sm uppercase tracking-wider">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 sm:p-12 text-center text-gray-400 text-sm sm:text-base">
                            <div className="flex flex-col items-center gap-3">
                              <AlertCircle size={48} className="text-gray-500" />
                              <span className="font-semibold">Không tìm thấy vé nào</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-white/5 hover:bg-white/10 transition-all duration-200"
                        >
                          <td className="p-3 sm:p-4 font-mono text-xs sm:text-sm break-all text-gray-200">{t.id}</td>
                          <td className="p-3 sm:p-4">
                            <div className="font-bold text-sm sm:text-base text-white">{t.name}</div>
                            <div className="text-xs sm:text-sm text-gray-300 break-all mt-1">{t.email}</div>
                            <div className="text-xs text-gray-400 sm:hidden mt-1">{t.phone} • {t.dob}</div>
                          </td>
                          <td className="p-3 sm:p-4 hidden sm:table-cell">
                            <div className="text-sm text-gray-200">{t.phone}</div>
                            <div className="text-xs text-gray-400 mt-1">{t.dob}</div>
                          </td>
                          <td className="p-3 sm:p-4">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-lg ${
                                t.tier === "vvip"
                                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
                                  : "bg-gradient-to-r from-yellow-400 to-yellow-500 text-black"
                              }`}
                            >
                              {getTierName(t.tier)}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4">
                            {t.paymentImage ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={t.paymentImage}
                                  alt="Payment"
                                  className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-lg border-2 border-yellow-400/50 cursor-pointer hover:opacity-80 hover:border-yellow-400 transition-all shadow-lg"
                                  onClick={() => setSelectedImage(t.paymentImage)}
                                />
                                <button
                                  onClick={() => setSelectedImage(t.paymentImage)}
                                  className="text-yellow-400 underline text-xs sm:text-sm hover:text-yellow-300 transition hidden sm:inline font-medium"
                                >
                                  Xem
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-xs sm:text-sm">-</span>
                            )}
                          </td>
                          <td className="p-3 sm:p-4">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                handleStatusChange(t.id, e.target.value)
                              }
                              className="bg-gray-700/80 backdrop-blur-sm text-white text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border-2 border-yellow-400/50 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all shadow-lg hover:border-yellow-400"
                            >
                              <option value="PENDING" className="text-white bg-gray-800">
                                Chờ CK
                              </option>
                              <option value="PAID" className="text-white bg-gray-800">
                                Đã thanh toán
                              </option>
                              <option value="CHECKED_IN" className="text-white bg-gray-800">
                                Đã vào
                              </option>
                              <option value="CANCELLED" className="text-white bg-gray-800">
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
