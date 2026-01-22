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
  Loader2,
  Copy,
} from "lucide-react";
import { BackendAPI } from "../utils/api";
import { TIER_CONFIG } from "../utils/config";

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    paymentImage: null, // Sẽ lưu URL từ ImgBB
    tier: "vip", // Mặc định Vé Superior
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // Preview local image trước khi upload

  // State lưu trữ thống kê vé để validate real-time (load từ API)
  const [ticketStats, setTicketStats] = useState({
    supervipLimit: 0,
    vvipLimit: 0,
    vipLimit: 0,
    supervipRemaining: 0,
    vvipRemaining: 0,
    vipRemaining: 0,
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState("");

  // Load stats khi mở form
  useEffect(() => {
    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await BackendAPI.fetchData();
        if (data && data.stats) {
          setTicketStats(data.stats);
          setApiError(""); // Clear error nếu load thành công
        }
      } catch (error) {
        console.error("Lỗi load stats:", error);
        // Không hiển thị lỗi ở đây, chỉ khi submit form mới hiển thị
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  // Hàm format ngày sinh tự động thêm dấu "-"
  const formatDateInput = (value) => {
    // Chỉ lấy số từ input
    const numbers = value.replace(/\D/g, '');
    
    // Giới hạn tối đa 8 số (ddmmyyyy)
    const limitedNumbers = numbers.slice(0, 8);
    
    // Format: dd-mm-yyyy
    let formatted = '';
    if (limitedNumbers.length > 0) {
      formatted = limitedNumbers.slice(0, 2);
      if (limitedNumbers.length > 2) {
        formatted += '-' + limitedNumbers.slice(2, 4);
      }
      if (limitedNumbers.length > 4) {
        formatted += '-' + limitedNumbers.slice(4, 8);
      }
    }
    
    return formatted;
  };

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

  const validatePaymentImage = (img) => {
    if (!img) return "Vui lòng tải ảnh thanh toán";
    // Kiểm tra nếu là URL hợp lệ (từ ImgBB) hoặc base64 (fallback)
    if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('data:image'))) {
      return "";
    }
    return "Hình ảnh không hợp lệ";
  };

  const validateTier = (tier) => {
    if (tier === "supervip" && ticketStats.supervipRemaining <= 0)
      return "Vé Super VIP đã hết!";
    if (tier === "vvip" && ticketStats.vvipRemaining <= 0)
      return "Vé VIP đã hết!";
    if (tier === "vip" && ticketStats.vipRemaining <= 0)
      return "Vé Superior đã hết!";
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, paymentImage: "Ảnh quá lớn (>5MB)" });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, paymentImage: "Vui lòng chọn file ảnh" });
      return;
    }
    
    // Clear previous errors
    setErrors({ ...errors, paymentImage: "" });
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Upload to ImgBB
    setUploadingImage(true);
    try {
      const imageUrl = await BackendAPI.uploadImageToImgBB(file);
      handleChange("paymentImage", imageUrl);
      console.log("✅ Image uploaded to ImgBB:", imageUrl);
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      setErrors({ ...errors, paymentImage: error.message || "Không thể upload hình ảnh. Vui lòng thử lại." });
      setImagePreview(null);
      handleChange("paymentImage", null);
    } finally {
      setUploadingImage(false);
    }
  };

  const copyWalletAddress = async (walletAddress) => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(walletAddress);
      setTimeout(() => setCopiedAddress(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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
      await BackendAPI.registerTicket(formData);
      setIsSuccess(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hiển thị thông báo thành công
  if (isSuccess) {
    return (
      <div className="mx-auto w-full">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400">
          <div className="px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="text-green-500" size={64} />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Đăng ký thành công!
            </h2>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 sm:p-6 mb-6">
              <p className="text-base sm:text-lg text-gray-800 font-semibold mb-2">
                Cảm ơn bạn đã đăng ký vé ONFA 2026!
              </p>
              <p className="text-sm sm:text-base text-gray-700">
                Vui lòng đợi xác nhận và nhận thông tin vé qua Email đã đăng ký.
              </p>
              <p className="text-sm sm:text-base text-gray-700 mt-2">
                Email của bạn: <strong className="text-yellow-600">{formData.email}</strong>
              </p>
            </div>
            <button
              onClick={async () => {
                setIsSuccess(false);
                setFormData({
                  name: "",
                  email: "",
                  phone: "",
                  dob: "",
                  paymentImage: null,
                  tier: "vip",
                });
                setImagePreview(null);
                setErrors({});
                setTouched({});
                setApiError("");
                // Reload stats để cập nhật số lượng vé còn lại
                setIsLoadingStats(true);
                try {
                  const data = await BackendAPI.fetchData();
                  if (data && data.stats) {
                    setTicketStats(data.stats);
                  }
                } catch (error) {
                  console.error("Lỗi load stats:", error);
                } finally {
                  setIsLoadingStats(false);
                }
              }}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-400 transition shadow-lg text-sm sm:text-base"
            >
              Đăng ký vé khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading overlay component
  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md mx-4 border-2 border-yellow-400">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 text-yellow-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-full"></div>
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {isSubmitting ? "Đang xử lý..." : "Đang kết nối với server..."}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 text-center">
            {isSubmitting 
              ? "Vui lòng đợi trong giây lát, chúng tôi đang xử lý đăng ký của bạn"
              : "Đang tải thông tin vé, vui lòng đợi..."
            }
          </p>
          <div className="mt-6 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  const showFormUI = false;

  return (
    <div className="mx-auto w-full relative">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border-2 border-yellow-400">
        <div className="px-4 sm:px-6 md:px-8 py-10 sm:py-12 md:py-14 text-center">
          <div className="flex justify-center mb-6">
            <AlertCircle className="text-yellow-600" size={64} />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Form Đăng ký đã đóng
          </h2>
          <p className="text-sm sm:text-base text-gray-700">
            Cảm ơn bạn đã quan tâm. Hẹn gặp lại ở các sự kiện tiếp theo.
          </p>
        </div>
      </div>

      {showFormUI && (
      <div className="mx-auto w-full relative">
        {/* Loading Overlay */}
        {(isLoadingStats || isSubmitting) && <LoadingOverlay />}
        
        <div className={`bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          (isLoadingStats || isSubmitting) ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Banner */}
          <div className="w-full h-full bg-gray-900 overflow-hidden">
            <img
              src="/banner.jpg"
              alt="Banner"
              className="w-full h-full object-fill"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.parentElement.className = "w-full h-32 sm:h-40 md:h-48 bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center";
                e.target.parentElement.innerHTML = '<h2 class="text-xl sm:text-2xl md:text-3xl font-bold text-black px-4 text-center">ONFA 2026</h2>';
              }}
            />
          </div>

          {/* Form Inputs */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-7 md:py-8 space-y-4 sm:space-y-5 md:space-y-6">
            {apiError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-red-700 flex items-center">
                <AlertCircle className="mr-2" size={20} /> {apiError}
              </div>
            )}

            {/* Chọn hạng vé */}
            <div>
              <label className="block text-gray-700 font-semibold mb-4">
                <Ticket className="inline mr-2" size={18} />
                Chọn Hạng vé <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Vé Super VIP Card */}
                <button
                  type="button"
                  onClick={() => handleChange("tier", "supervip")}
                  disabled={ticketStats.supervipRemaining === 0}
                  className={`relative p-5 rounded-xl border transition-all duration-300 text-left h-full ${
                    formData.tier === "supervip"
                      ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg shadow-yellow-200/50"
                      : "border-gray-200 bg-white hover:border-yellow-300 hover:shadow-md"
                  } ${
                    ticketStats.supervipRemaining === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {formData.tier === "supervip" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="text-yellow-600" size={24} strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👑</span>
                    <span
                      className={`font-bold text-lg ${
                        formData.tier === "supervip"
                          ? "text-yellow-700"
                          : "text-gray-800"
                      }`}
                    >
                      Vé Super VIP
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Giá:</span>
                      <span className="text-base font-bold text-yellow-700">{TIER_CONFIG.supervip.price}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Còn lại:</span>
                      <span className={`text-sm font-bold ${
                        ticketStats.supervipRemaining === 0 ? "text-red-600" : "text-gray-800"
                      }`}>
                        {ticketStats.supervipRemaining}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 mt-3">
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Khu vực chỗ ngồi VIP nhất, ngay sát sân khấu với tầm nhìn tuyệt đối</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Trọn bộ quà tặng cao cấp và độc quyền từ Mettitech và ONFA</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Ưu tiên đặc biệt trong các hoạt động và sự kiện</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Vé VIP Card */}
                <button
                  type="button"
                  onClick={() => handleChange("tier", "vvip")}
                  disabled={ticketStats.vvipRemaining === 0}
                  className={`relative p-5 rounded-xl border transition-all duration-300 text-left h-full ${
                    formData.tier === "vvip"
                      ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg shadow-yellow-200/50"
                      : "border-gray-200 bg-white hover:border-yellow-300 hover:shadow-md"
                  } ${
                    ticketStats.vvipRemaining === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {formData.tier === "vvip" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="text-yellow-600" size={24} strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎫</span>
                    <span
                      className={`font-bold text-lg ${
                        formData.tier === "vvip"
                          ? "text-yellow-700"
                          : "text-gray-800"
                      }`}
                    >
                      Vé VIP
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Giá:</span>
                      <span className="text-base font-bold text-purple-600">150 OFT</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Còn lại:</span>
                      <span className={`text-sm font-bold ${
                        ticketStats.vvipRemaining === 0 ? "text-red-600" : "text-gray-800"
                      }`}>
                        {ticketStats.vvipRemaining}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 mt-3">
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Ưu tiên khu vực chỗ ngồi gần sân khấu với tầm nhìn bao quát</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Đặc biệt đi kèm trọn bộ quà tặng độc quyền và giá trị đến từ Mettitech và ONFA</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Vé Superior Card */}
                <button
                  type="button"
                  onClick={() => handleChange("tier", "vip")}
                  disabled={ticketStats.vipRemaining === 0}
                  className={`relative p-5 rounded-xl border transition-all duration-300 text-left h-full ${
                    formData.tier === "vip"
                      ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 shadow-lg shadow-yellow-200/50"
                      : "border-gray-200 bg-white hover:border-yellow-300 hover:shadow-md"
                  } ${
                    ticketStats.vipRemaining === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {formData.tier === "vip" && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle className="text-yellow-600" size={24} strokeWidth={2.5} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎫</span>
                    <span
                      className={`font-bold text-lg ${
                        formData.tier === "vip"
                          ? "text-yellow-700"
                          : "text-gray-800"
                      }`}
                    >
                      Vé Superior
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Giá:</span>
                      <span className="text-base font-bold text-yellow-600">100 OFT</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-500 font-medium">Còn lại:</span>
                      <span className={`text-sm font-bold ${
                        ticketStats.vipRemaining === 0 ? "text-red-600" : "text-gray-800"
                      }`}>
                        {ticketStats.vipRemaining}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 mt-3">
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-0.5">•</span>
                          <span>Gói quà tặng tri ân từ Mettitech và ONFA</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
              {errors.tier && touched.tier && (
                <p className="mt-3 text-sm text-red-600 flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {errors.tier}
                </p>
              )}
            </div>

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
                className={`w-full px-4 py-3 rounded-lg border bg-[#f2f4f7] text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
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
                Email (Sử dụng tài khoản ONFA) <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`w-full px-4 py-3 rounded-lg border bg-[#f2f4f7] text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
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
                  className={`w-full px-4 py-3 rounded-lg border bg-[#f2f4f7] text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
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
                  placeholder="dd-mm-yyyy (VD: 15012000)"
                  value={formData.dob}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    handleChange("dob", formatted);
                  }}
                  onBlur={() => handleBlur("dob")}
                  className={`w-full px-4 py-3 rounded-lg border bg-[#f2f4f7] text-black placeholder-gray-500 focus:outline-none focus:ring-2 ${
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

            {/* QR Thanh toán - VietQR Style */}
            <div className="bg-white border-2 border-blue-300 rounded-lg shadow-lg overflow-hidden">

              {/* Content */}
              <div className="bg-[#fefdf3] rounded-lg p-4">
                <div className="flex flex-col items-center mb-4">
                  <div className="bg-white p-3 sm:p-4 border border-gray-200 rounded-lg mb-3 w-full">
                  <div className="text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        👉 Mạng ONFA Chain
                  </div>
                  <div className="rounded-lg bg-gray-200 p-3 sm:p-4 mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        <span className="flex-1 min-w-0">📌 Địa chỉ ví nhận OFT: 0x229cd689abca9543f312bdceae42b367edf691b7</span>
                        <button
                          type="button"
                          onClick={() => copyWalletAddress("0x229cd689abca9543f312bdceae42b367edf691b7")}
                          className="ml-auto flex-shrink-0 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                          title="Copy địa chỉ ví"
                        >
                          {copiedAddress === "0x229cd689abca9543f312bdceae42b367edf691b7" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        <span className="flex-1 min-w-0">📌 Địa chỉ ví nhận USDT: 0x4986c96a4b9c05b2872cfcee63b831ecf672ff6c</span>
                        <button
                          type="button"
                          onClick={() => copyWalletAddress("0x4986c96a4b9c05b2872cfcee63b831ecf672ff6c")}
                          className="ml-auto flex-shrink-0 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                          title="Copy địa chỉ ví"
                        >
                          {copiedAddress === "0x4986c96a4b9c05b2872cfcee63b831ecf672ff6c" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  <div className="text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        👉 Mạng Binance Smart Chain
                  </div>
                    <div className="rounded-lg bg-gray-200 p-3 sm:p-4 mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        <span className="flex-1 min-w-0">📌 Địa chỉ ví nhận OFT: 0xc26da070ce179e9da59c7eb9d47ec5705a36371a</span>
                        <button
                          type="button"
                          onClick={() => copyWalletAddress("0xc26da070ce179e9da59c7eb9d47ec5705a36371a")}
                          className="ml-auto flex-shrink-0 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                          title="Copy địa chỉ ví"
                        >
                          {copiedAddress === "0xc26da070ce179e9da59c7eb9d47ec5705a36371a" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base text-gray-900 font-mono font-semibold break-all">
                        <span className="flex-1 min-w-0">📌 Địa chỉ ví nhận USDT: 0xf41715df29e187d95ca2023ce8193840854e7716</span>
                        <button
                          type="button"
                          onClick={() => copyWalletAddress("0xf41715df29e187d95ca2023ce8193840854e7716")}
                          className="ml-auto flex-shrink-0 p-2 hover:bg-gray-300 rounded-lg transition-colors"
                          title="Copy địa chỉ ví"
                        >
                          {copiedAddress === "0xf41715df29e187d95ca2023ce8193840854e7716" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
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
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                    <p className="text-sm text-gray-600">Đang upload hình ảnh...</p>
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 object-contain rounded opacity-50"
                      />
                    )}
                  </div>
                ) : formData.paymentImage ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.paymentImage}
                      alt="Payment"
                      className="h-32 object-contain rounded"
                      onError={(e) => {
                        console.error("Failed to load image:", formData.paymentImage);
                        e.target.style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleChange("paymentImage", null);
                        setImagePreview(null);
                      }}
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


            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold py-3 sm:py-4 rounded-lg hover:opacity-90 transition shadow-lg disabled:opacity-50 text-sm sm:text-base"
            >
              {isSubmitting ? "Đang xử lý..." : "ĐĂNG KÝ NGAY"}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default RegistrationForm;
