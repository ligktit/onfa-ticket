import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  Ticket,
  CheckCircle,
  AlertCircle,
  Calendar,
  Upload,
  ImageIcon,
} from "lucide-react";
import { BackendAPI } from "../utils/api";
import { TIER_CONFIG } from "../utils/config";

const RegistrationForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    paymentImage: null,
    tier: "vip", // Mặc định VIP B
  });

  // State lưu trữ thống kê vé để validate real-time (load từ API)
  const [ticketStats, setTicketStats] = useState({
    vvipLimit: 0,
    vipLimit: 0,
    vvipRemaining: 0,
    vipRemaining: 0,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Load stats khi mở form
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await BackendAPI.fetchData();
        if (data && data.stats) {
          setTicketStats(data.stats);
          setApiError(""); // Clear error nếu load thành công
        }
      } catch (error) {
        console.error("Lỗi load stats:", error);
        // Không hiển thị lỗi ở đây, chỉ khi submit form mới hiển thị
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
    <div className="mx-auto w-full">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400">
        {/* Banner */}
        <div className="w-full h-full bg-gray-900 overflow-hidden">
          <img
            src="/src/assets/banner.jpg"
            alt="Banner"
            className="w-full h-full object-fill"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.className = "w-full h-32 sm:h-40 md:h-48 bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center";
              e.target.parentElement.innerHTML = '<h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-black px-4 text-center">ONFA 2026</h2>';
            }}
          />
        </div>

        {/* Thông tin vé */}
        <div className="bg-gray-50 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {["vvip", "vip"].map((type) => {
              const conf = TIER_CONFIG[type];
              const remaining =
                type === "vvip"
                  ? ticketStats.vvipRemaining
                  : ticketStats.vipRemaining;
              const totalTickets =
                type === "vvip"
                  ? ticketStats.vvipLimit
                  : ticketStats.vipLimit;
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
                    <p className="font-bold text-yellow-600">{conf.price}</p>
                    <div className="text-red-600 font-semibold space-y-0.5">
                      <p className="text-xs">Còn lại: <span className="font-bold">{remaining}</span></p>
                    </div>
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
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8 space-y-4 sm:space-y-5 md:space-y-6">
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

          {/* QR Thanh toán */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 text-center">
              💳 QR Code Thanh toán
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
              <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-yellow-400">
                <img
                  src="/src/assets/payment.jpg"
                  alt="QR Thanh toán"
                  className="w-40 h-40 sm:w-48 sm:h-48 object-contain"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = '<div class="w-40 h-40 sm:w-48 sm:h-48 bg-gray-200 flex items-center justify-center text-gray-500 text-xs sm:text-sm text-center px-2">QR Code<br/>Thanh toán</div>';
                  }}
                />
              </div>
              <div className="text-xs sm:text-sm text-gray-700 space-y-2 max-w-md">
                <p className="font-semibold">Hướng dẫn thanh toán:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Quét QR code bên cạnh</li>
                  <li>Chuyển khoản số tiền tương ứng</li>
                  <li>Chụp ảnh màn hình xác nhận</li>
                  <li>Tải ảnh lên form bên dưới</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Upload ảnh */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              <Upload size={18} className="inline mr-2" />
              Hình ảnh thanh toán <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 sm:p-5 md:p-6 text-center ${
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
                  <span className="text-yellow-600 font-medium">
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
                  <p className="text-xs">• Quà tặng đặc biệt từ METTITECH và ONFA</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChange("tier", "vip")}
                disabled={ticketStats.vipRemaining === 0}
                className={`p-4 rounded-lg border-2 transition text-left h-full ${
                  formData.tier === "vip"
                    ? "border-yellow-500 bg-yellow-50 shadow-md"
                    : "border-gray-300 bg-white hover:border-yellow-300"
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
                        ? "text-yellow-700"
                        : "text-gray-700"
                    }`}
                  >
                    🎫 VIP B
                  </span>
                  {formData.tier === "vip" && (
                    <CheckCircle className="text-yellow-600" size={20} />
                  )}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-yellow-600">Giá: 50 OFT</p>
                  <p className="text-xs">• Quà tặng đặc biệt từ METTITECH và ONFA</p>
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
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 sm:py-4 rounded-lg hover:opacity-90 transition shadow-lg disabled:opacity-50 border-2 border-yellow-400 text-sm sm:text-base"
          >
            {isSubmitting ? "Đang xử lý..." : "ĐĂNG KÝ NGAY"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
