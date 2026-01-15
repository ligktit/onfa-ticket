import React, { useState, useEffect } from "react";
import {
  Camera,
  QrCode,
  User,
  Mail,
  Phone,
  Ticket,
  CheckCircle,
  Users,
  AlertCircle,
  Calendar,
  Upload,
  ImageIcon,
} from "lucide-react";

// Cấu hình URL Backend
const API_URL = "http://localhost:5173/api";

// Cấu hình hiển thị (Dùng để tham chiếu text)
const TIER_CONFIG = {
  vvip: {
    label: "VIP A",
    limit: 50,
    price: "100 OFT",
    benefits: ["Ưu tiên chỗ ngồi", "Bộ quà tặng đặc biệt"],
  },
  vip: {
    label: "VIP B",
    limit: 200,
    price: "50 OFT",
    benefits: ["Bộ quà tặng đặc biệt"],
  },
};

// API Service
const BackendAPI = {
  fetchData: async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      if (!response.ok) throw new Error("Lỗi kết nối server");
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  registerTicket: async (ticketData) => {
    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticketData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Đăng ký thất bại");
    return data;
  },

  checkIn: async (ticketId) => {
    const response = await fetch(`${API_URL}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Check-in thất bại");
    return data;
  },

  updateTicketStatus: async (ticketId, newStatus) => {
    const response = await fetch(`${API_URL}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, status: newStatus }),
    });
    return await response.json();
  },
};

// Component Form đăng ký
const RegistrationForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    paymentImage: null,
    tier: "vip", // Mặc định VIP B
  });

  // State lưu trữ thống kê vé để validate real-time
  const [ticketStats, setTicketStats] = useState({
    vvipRemaining: 50,
    vipRemaining: 200,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Load stats khi mở form
  useEffect(() => {
    const loadStats = async () => {
      const data = await BackendAPI.fetchData();
      if (data && data.stats) {
        setTicketStats(data.stats);
      }
    };
    loadStats();
  }, []);

  // --- Validations ---
  const validateName = (name) => {
    if (!name.trim()) return "Vui lòng nhập họ tên";
    if (name.trim().length < 3) return "Tối thiểu 3 ký tự";
    return "";
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? "" : "Email không hợp lệ";
  };

  const validatePhone = (phone) => {
    const regex = /^(0|\+84)[0-9]{9,10}$/;
    return regex.test(phone.replace(/\s/g, "")) ? "" : "SĐT không hợp lệ";
  };

  const validateDob = (dob) => {
    if (!dob.trim()) return "Vui lòng nhập ngày sinh";
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[012])-\d{4}$/;
    if (!dateRegex.test(dob)) return "Định dạng dd-mm-yyyy (VD: 15-01-2000)";
    return "";
  };

  const validatePaymentImage = (img) =>
    img ? "" : "Vui lòng tải ảnh thanh toán";

  const validateTier = (tier) => {
    if (tier === "vvip" && ticketStats.vvipRemaining <= 0)
      return "Vé VIP A đã hết!";
    if (tier === "vip" && ticketStats.vipRemaining <= 0)
      return "Vé VIP B đã hết!";
    return "";
  };

  // --- Handlers ---
  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    validateField(field, formData[field]);
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setApiError("");
    if (touched[field]) validateField(field, value);
  };

  const validateField = (field, value) => {
    let error = "";
    switch (field) {
      case "name":
        error = validateName(value);
        break;
      case "email":
        error = validateEmail(value);
        break;
      case "phone":
        error = validatePhone(value);
        break;
      case "dob":
        error = validateDob(value);
        break;
      case "paymentImage":
        error = validatePaymentImage(value);
        break;
      case "tier":
        error = validateTier(value);
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, paymentImage: "Ảnh quá lớn (>5MB)" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => handleChange("paymentImage", reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    // Validate all
    const newErrors = {
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      phone: validatePhone(formData.phone),
      dob: validateDob(formData.dob),
      paymentImage: validatePaymentImage(formData.paymentImage),
      tier: validateTier(formData.tier),
    };
    setErrors(newErrors);
    setTouched({
      name: true,
      email: true,
      phone: true,
      dob: true,
      paymentImage: true,
      tier: true,
    });

    if (Object.values(newErrors).some((err) => err)) return;

    setIsSubmitting(true);
    try {
      const ticket = await BackendAPI.registerTicket(formData);
      onSuccess(ticket);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8 px-8 text-center">
          <h2 className="text-2xl text-purple-100 ">🎉 Đăng ký tham dự</h2>
          <p className="text-3xl font-bold mb-2">
            HÀNH TRÌNH TRI ÂN & CHÀO ĐÓN TẾT CỔ TRUYỀN VIỆT NAM 2026
          </p>
        </div>

        {/* Thông tin vé */}
        <div className="bg-purple-50 px-8 py-6 border-b border-purple-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["vvip", "vip"].map((type) => {
              const conf = TIER_CONFIG[type];
              const remaining =
                type === "vvip"
                  ? ticketStats.vvipRemaining
                  : ticketStats.vipRemaining;
              const isSoldOut = remaining <= 0;

              return (
                <div
                  key={type}
                  className={`bg-white rounded-lg p-4 shadow-sm border-2 relative overflow-hidden ${
                    type === "vvip" ? "border-yellow-400" : "border-blue-400"
                  }`}
                >
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-gray-100/90 flex items-center justify-center z-10">
                      <span className="text-red-600 font-bold border-2 border-red-600 px-4 py-1 rounded -rotate-12 text-xl">
                        HẾT VÉ
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <span
                      className={`font-bold text-lg ${
                        type === "vvip" ? "text-yellow-600" : "text-blue-600"
                      }`}
                    >
                      {type === "vvip" ? "🌟" : "🎫"} {conf.label}
                    </span>
                  </div>
                  <div className="text-sm font-medium space-y-1">
                    <p className="font-bold text-purple-700">{conf.price}</p>
                    <ul className="list-disc list-inside text-gray-600 text-xs">
                      {conf.benefits.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="px-8 py-8 space-y-6">
          {apiError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 flex items-center">
              <AlertCircle className="mr-2" size={20} /> {apiError}
            </div>
          )}

          {/* Họ tên */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <User size={18} className="inline mr-2" />
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 ${
                errors.name && touched.name
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Nguyễn Văn A"
            />
            {errors.name && touched.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Mail size={18} className="inline mr-2" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 ${
                errors.email && touched.email
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              placeholder="email@example.com"
            />
            {errors.email && touched.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SĐT */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                <Phone size={18} className="inline mr-2" />
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                onBlur={() => handleBlur("phone")}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 ${
                  errors.phone && touched.phone
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0901234567"
              />
              {errors.phone && touched.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                <Calendar size={18} className="inline mr-2" />
                Ngày sinh <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength="10"
                placeholder="dd-mm-yyyy"
                value={formData.dob}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[\d-]*$/.test(val)) handleChange("dob", val);
                }}
                onBlur={() => handleBlur("dob")}
                className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 ${
                  errors.dob && touched.dob
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {errors.dob && touched.dob && (
                <p className="text-red-500 text-sm mt-1">{errors.dob}</p>
              )}
            </div>
          </div>

          {/* Upload ảnh */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Upload size={18} className="inline mr-2" />
              Hình ảnh thanh toán <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                errors.paymentImage && touched.paymentImage
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            >
              {formData.paymentImage ? (
                <div className="relative inline-block">
                  <img
                    src={formData.paymentImage}
                    alt="Payment"
                    className="h-32 object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleChange("paymentImage", null)}
                    className="block w-full mt-2 text-red-600 text-sm hover:underline"
                  >
                    Xóa ảnh
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <span className="text-purple-600 font-medium">
                    Tải ảnh lên
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
            {errors.paymentImage && touched.paymentImage && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentImage}</p>
            )}
          </div>

          {/* Chọn hạng vé */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Ticket className="inline mr-2" size={18} />
              Chọn Hạng vé <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleChange("tier", "vvip")}
                disabled={ticketStats.vvipRemaining === 0}
                className={`p-4 rounded-lg border-2 transition text-left h-full ${
                  formData.tier === "vvip"
                    ? "border-yellow-500 bg-yellow-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-yellow-300"
                } ${
                  ticketStats.vvipRemaining === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`font-bold text-lg ${
                      formData.tier === "vvip"
                        ? "text-yellow-700"
                        : "text-gray-700"
                    }`}
                  >
                    🌟 VIP A
                  </span>
                  {formData.tier === "vvip" && (
                    <CheckCircle className="text-yellow-600" size={20} />
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-purple-700">Giá: 100 OFT</p>
                  <p className="text-xs">• Ưu tiên chỗ ngồi</p>
                  <p className="text-xs">• Quà tặng đặc biệt từ BTC</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChange("tier", "vip")}
                disabled={ticketStats.vipRemaining === 0}
                className={`p-4 rounded-lg border-2 transition text-left h-full ${
                  formData.tier === "vip"
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-blue-300"
                } ${
                  ticketStats.vipRemaining === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className={`font-bold text-lg ${
                      formData.tier === "vip"
                        ? "text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    🎫 VIP B
                  </span>
                  {formData.tier === "vip" && (
                    <CheckCircle className="text-blue-600" size={20} />
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-purple-700">Giá: 50 OFT</p>
                  <p className="text-xs">• Quà tặng đặc biệt từ BTC</p>
                </div>
              </button>
            </div>
            {errors.tier && touched.tier && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.tier}
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-lg hover:opacity-90 transition shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? "Đang xử lý..." : "🎉 Đăng ký ngay"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [view, setView] = useState("register");
  const [registeredTicket, setRegisteredTicket] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    vvipCount: 0,
    vipCount: 0,
    vvipRemaining: 50,
    vipRemaining: 200,
    totalRegistered: 0,
    totalCheckedIn: 0,
  });
  const [error, setError] = useState("");

  // Hàm load dữ liệu từ Server
  const loadData = async () => {
    const data = await BackendAPI.fetchData();
    if (data) {
      setStats(data.stats);
      setTickets(data.tickets);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto refresh 5s
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setError("");
    try {
      const ticket = await BackendAPI.checkIn(scanInput.trim());
      setScanResult(ticket);
      setScanInput("");
      loadData();
    } catch (err) {
      setError(err.message);
      setScanResult(null);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await BackendAPI.updateTicketStatus(ticketId, newStatus);
    loadData();
  };

  // Helper hiển thị tên vé
  const getTierName = (tier) => (tier === "vvip" ? "VIP A" : "VIP B");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 font-sans">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🎉 ONFA TICKET</h1>
          <p className="text-purple-200 text-lg">Hệ thống quản lý vé sự kiện</p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          {[
            { id: "register", label: "Đăng ký vé", icon: User },
            { id: "scan", label: "Check-in", icon: Camera },
            { id: "admin", label: "Admin", icon: Users },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setView(btn.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center ${
                view === btn.id
                  ? "bg-white text-purple-900"
                  : "bg-purple-800 text-white hover:bg-purple-700"
              }`}
            >
              <btn.icon size={20} className="mr-2" /> {btn.label}
            </button>
          ))}
        </div>

        {/* Dashboard Stats (Ẩn khi đang đăng ký) */}
        {view !== "register" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="VIP A Còn lại"
              value={`${stats.vvipRemaining}/${TIER_CONFIG.vvip.limit}`}
              color="yellow"
            />
            <StatCard
              label="VIP B Còn lại"
              value={`${stats.vipRemaining}/${TIER_CONFIG.vip.limit}`}
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
        )}

        {/* Main Views */}
        <div className="transition-all">
          {view === "register" && (
            <RegistrationForm
              onSuccess={(t) => {
                setRegisteredTicket(t);
                setView("qr");
              }}
            />
          )}

          {view === "qr" && registeredTicket && (
            <TicketView
              ticket={registeredTicket}
              onClose={() => {
                setView("register");
                setRegisteredTicket(null);
              }}
            />
          )}

          {view === "scan" && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                Check-in
              </h2>
              {error && (
                <div className="bg-red-500/20 text-red-100 p-3 rounded mb-4 border border-red-500/50 text-center">
                  {error}
                </div>
              )}

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleScan()}
                  placeholder="Nhập mã vé..."
                  className="flex-1 px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  onClick={handleScan}
                  className="px-6 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Check-in
                </button>
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

          {view === "admin" && (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                Admin Dashboard
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-white">
                  <thead className="border-b border-white/20">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Tên / Email</th>
                      <th className="p-3">SĐT / DOB</th>
                      <th className="p-3">Hạng</th>
                      <th className="p-3">Ảnh</th>
                      <th className="p-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-white/10 hover:bg-white/5"
                      >
                        <td className="p-3 font-mono text-sm">{t.id}</td>
                        <td className="p-3">
                          <div className="font-bold">{t.name}</div>
                          <div className="text-xs text-gray-300">{t.email}</div>
                        </td>
                        <td className="p-3">
                          <div>{t.phone}</div>
                          <div className="text-xs text-gray-300">{t.dob}</div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              t.tier === "vvip"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                            }`}
                          >
                            {getTierName(t.tier)}
                          </span>
                        </td>
                        <td className="p-3">
                          {t.paymentImage ? (
                            <a
                              href={t.paymentImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 underline text-xs"
                            >
                              Xem
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3">
                          <select
                            value={t.status}
                            onChange={(e) =>
                              handleStatusChange(t.id, e.target.value)
                            }
                            className="bg-white/20 text-white text-sm rounded px-2 py-1 border-none focus:ring-1 focus:ring-purple-400"
                          >
                            <option value="PENDING" className="text-black">
                              Chờ CK
                            </option>
                            <option value="CHECKED_IN" className="text-black">
                              Đã vào
                            </option>
                            <option value="CANCELLED" className="text-black">
                              Hủy
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-components nhỏ để code gọn hơn
const StatCard = ({ label, value, color }) => {
  const colors = {
    yellow: "bg-yellow-500 border-yellow-400 text-yellow-300",
    blue: "bg-blue-500 border-blue-400 text-blue-300",
    green: "bg-green-500 border-green-400 text-green-300",
    purple: "bg-purple-500 border-purple-400 text-purple-300",
  };
  return (
    <div
      className={`${colors[color]} bg-opacity-20 backdrop-blur-sm border rounded-lg p-4 text-center`}
    >
      <div className="text-sm font-semibold mb-1 opacity-80">{label}</div>
      <div className="text-white text-2xl font-bold">{value}</div>
    </div>
  );
};

const TicketView = ({ ticket, onClose }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 text-center max-w-md mx-auto">
    <h2 className="text-3xl font-bold text-white mb-6">Vé của bạn</h2>
    <div className="bg-white rounded-2xl p-8 shadow-2xl text-left">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-t-xl -mx-8 -mt-8 mb-6 text-center">
        <h3 className="text-2xl font-bold">ONFA 2026</h3>
        <p className="text-sm">
          Vé {ticket.tier === "vvip" ? "VIP A" : "VIP B"}
        </p>
      </div>
      <div className="mb-6 text-center">
        <QrCode size={180} className="mx-auto text-gray-800" />
        <div className="mt-2 text-xl font-mono font-bold text-gray-800">
          {ticket.id}
        </div>
      </div>
      <div className="space-y-2 bg-gray-50 p-4 rounded text-sm text-gray-800">
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
    <button
      onClick={onClose}
      className="mt-6 px-8 py-3 bg-white text-purple-900 rounded-lg font-semibold hover:bg-gray-100 transition"
    >
      Đăng ký vé khác
    </button>
  </div>
);

export default App;
