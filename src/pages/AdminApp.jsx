import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, AlertCircle, LogOut, Scan, Search, Filter, Loader2, Upload } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { io } from "socket.io-client";
import { BackendAPI } from "../utils/api";
import { TIER_CONFIG, getTierName } from "../utils/config";
import StatCard from "../components/StatCard";
import CheckInNotification from "../components/CheckInNotification";

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
  const [pendingStatusChanges, setPendingStatusChanges] = useState({}); // Track pending status changes: { ticketId: newStatus }
  const [filterTier, setFilterTier] = useState("ALL"); // ALL, vvip, vip
  const [notificationTicket, setNotificationTicket] = useState(null); // For Socket.IO notifications
  const qrCodeRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const socketRef = useRef(null);
  const qrReaderContainerRef = useRef(null);

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
    
    // Auto refresh with longer interval to reduce database load
    // In dev: Socket.IO handles real-time updates, polling is backup/fallback
    // In prod: Socket.IO disabled, polling is the primary update mechanism
    const interval = setInterval(() => {
      // In production, socketRef.current is null, so always poll
      // In development, only poll if Socket.IO is disconnected
      if (!socketRef.current?.connected) {
        if (import.meta.env.DEV) {
          console.log('⚠️ Socket.IO disconnected, refreshing data via polling...');
        }
        loadData(false);
      }
      // In dev: Socket.IO events will trigger loadData when connected
    }, 60000); // Auto refresh every 60 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Socket.IO connection for real-time check-in notifications
  // Only enabled in development mode (production uses polling fallback)
  useEffect(() => {
    // Skip Socket.IO in production
    if (!import.meta.env.DEV) {
      console.log('ℹ️ Production mode: Socket.IO disabled. Using polling fallback.');
      return;
    }

    // Determine Socket.IO server URL (dev mode only)
    let SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
    
    if (!SOCKET_URL) {
      // In dev mode: if accessing from network IP, use network IP for Socket.IO
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Accessed from network IP (phone)
        SOCKET_URL = `http://${hostname}:5000`;
      } else {
        // Accessed from localhost (computer)
        SOCKET_URL = "http://localhost:5000";
      }
    }
    
    console.log(`🔌 Connecting to Socket.IO server: ${SOCKET_URL}`);
    
    // Connect to Socket.IO server
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      setConnectionError(''); // Clear any connection errors
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO server');
      console.log('⚠️ Real-time notifications disabled. Using polling fallback.');
    });

    socketRef.current.on('connect_error', (error) => {
      console.warn('⚠️ Socket.IO connection error:', error.message);
      console.warn('⚠️ Falling back to polling for updates.');
    });

    // Listen for check-in events
    socketRef.current.on('ticket-checked-in', (ticketData) => {
      console.log('📢 Received check-in notification:', ticketData);
      // Show notification popup
      setNotificationTicket(ticketData);
      // Update local state instead of full refresh to reduce DB load
      // Socket.IO event already contains updated ticket data, so update locally
      setTickets(prevTickets => {
        const updated = prevTickets.map(t => 
          t.id === ticketData.ticketId ? { 
            ...t, 
            status: ticketData.status || 'CHECKED_IN',
            // Update other fields if provided
            ...(ticketData.name && { name: ticketData.name }),
            ...(ticketData.email && { email: ticketData.email })
          } : t
        );
        // Update stats locally without DB query
        const checkedInCount = updated.filter(t => t.status === 'CHECKED_IN').length;
        setStats(prevStats => ({
          ...prevStats,
          totalCheckedIn: checkedInCount
        }));
        return updated;
      });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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
      
      // Ensure container exists before starting
      const containerId = "qr-reader";
      let container = qrReaderContainerRef.current || document.getElementById(containerId);
      if (!container) {
        // Container doesn't exist yet, wait a bit for React to render
        await new Promise(resolve => setTimeout(resolve, 200));
        container = qrReaderContainerRef.current || document.getElementById(containerId);
        if (!container) {
          throw new Error("Container element không tồn tại. Vui lòng thử lại.");
        }
      }
      
      // Clear any existing content in container (React might have added something)
      // But only if scanner hasn't started yet
      if (!html5QrCodeRef.current) {
        container.innerHTML = '';
      }
      
      // Stop any existing scanner first
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore if already stopped
        }
        html5QrCodeRef.current = null;
      }
      
      // Check if camera is available
      console.log("📷 Checking for cameras...");
      const devices = await Html5Qrcode.getCameras();
      console.log("📷 Available cameras:", devices);
      
      if (!devices || devices.length === 0) {
        throw new Error("Không tìm thấy camera. Vui lòng kiểm tra camera của bạn.");
      }

      // Check if accessing via HTTPS (required for iOS Safari camera)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setError("⚠️ iOS Safari yêu cầu HTTPS để sử dụng camera. Vui lòng sử dụng ngrok hoặc nhập mã vé thủ công.");
        setIsScanning(false);
        return;
      }
      
      console.log("📷 Starting QR scanner...");
      
      // Wait a bit to ensure container is fully rendered by React
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify container exists and has dimensions
      container = document.getElementById(containerId);
      if (!container) {
        throw new Error("Container element không tồn tại sau khi render.");
      }
      
      // Ensure container has proper dimensions
      const containerWidth = container.offsetWidth || container.clientWidth;
      const containerHeight = container.offsetHeight || container.clientHeight;
      
      if (containerWidth === 0 || containerHeight === 0) {
        console.warn("Container has zero dimensions, waiting longer...");
        await new Promise(resolve => setTimeout(resolve, 500));
        // Check again
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          throw new Error("Container không có kích thước. Vui lòng thử lại.");
        }
      }
      
      console.log(`📷 Container dimensions: ${containerWidth}x${containerHeight}`);
      
      const html5QrCode = new Html5Qrcode(containerId);

      // Try to start with back camera first, fallback to any camera
      let cameraId = null;
      try {
        // Try to find back camera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera?.id || devices[0].id;
      } catch (e) {
        cameraId = devices[0].id;
      }

      console.log("📷 Starting camera with ID:", cameraId || "environment");
      
      await html5QrCode.start(
        cameraId || { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // QR code scanned successfully
          console.log("✅ QR Code scanned:", decodedText);
          setScanInput(decodedText);
          stopQRScanner();
          handleScanWithId(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (continuous scanning)
          // Only log if it's not a common "not found" error
          if (!errorMessage.includes("NotFoundException") && !errorMessage.includes("No QR code")) {
            console.debug("QR scan error (ignored):", errorMessage);
          }
        }
      );
      
      // Only set ref after scanner successfully starts
      html5QrCodeRef.current = html5QrCode;
      
      // Force React to update to hide loading indicator and show video
      // Use setTimeout to ensure video is rendered first
      setTimeout(() => {
        console.log("✅ Camera started successfully - video should be visible now");
        // Check if video element exists
        const video = container.querySelector('video');
        if (video) {
          console.log("✅ Video element found:", video.videoWidth, "x", video.videoHeight);
        } else {
          console.warn("⚠️ Video element not found in container");
        }
      }, 500);
    } catch (err) {
      console.error("❌ Camera error:", err);
      let errorMsg = "Không thể khởi động camera. ";
      
      const errName = err.name || "";
      const errMessage = err.message || err.toString() || "";
      
      if (errName === "NotAllowedError" || errMessage.includes("permission") || errMessage.includes("Permission")) {
        errorMsg = "⚠️ Quyền truy cập camera bị từ chối. Vui lòng:\n" +
                   "1. Click vào biểu tượng khóa ở thanh địa chỉ\n" +
                   "2. Cho phép truy cập camera\n" +
                   "3. Tải lại trang và thử lại";
      } else if (errName === "NotFoundError" || errMessage.includes("NotFound") || errMessage.includes("camera")) {
        errorMsg = "❌ Không tìm thấy camera. Vui lòng:\n" +
                   "1. Kiểm tra camera đã được kết nối\n" +
                   "2. Đảm bảo không có ứng dụng khác đang sử dụng camera\n" +
                   "3. Thử lại";
      } else if (errName === "NotReadableError" || errMessage.includes("NotReadable")) {
        errorMsg = "⚠️ Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.";
      } else if (errMessage.includes("Container")) {
        errorMsg = "Lỗi hệ thống: Container không tồn tại. Vui lòng tải lại trang.";
      } else if (errMessage) {
        errorMsg += errMessage;
      } else {
        errorMsg += "Vui lòng kiểm tra quyền truy cập camera và thử lại.";
      }
      
      setError(errorMsg);
      setIsScanning(false);
      html5QrCodeRef.current = null;
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

  // Handle QR code file upload (works on HTTP - no HTTPS required!)
  // Perfect for mobile: take photo with camera or select from gallery, then scan QR code
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      setIsScanning(true); // Show loading state
      setScanResult(null); // Clear previous results
      
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        setError("Vui lòng chọn file ảnh (JPG, PNG, etc.)");
        setIsScanning(false);
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 10MB.");
        setIsScanning(false);
        return;
      }

      // Stop any active camera scanning first (required for file scanning)
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch (e) {
          // Ignore if already stopped
        }
        html5QrCodeRef.current = null;
      }

      // Use a dedicated hidden container for file scanning (recommended pattern)
      const containerId = "qr-reader-file-" + Date.now();
      
      // Remove any existing containers to avoid conflicts
      const existingContainers = document.querySelectorAll('[id^="qr-reader-file-"]');
      existingContainers.forEach(el => el.remove());
      
      // Create hidden container (display:none, not visibility:hidden)
      const container = Object.assign(document.createElement("div"), {
        id: containerId,
        style: "display:none"
      });
      document.body.appendChild(container);

      // Create Html5Qrcode instance for file scanning
      const html5QrCode = new Html5Qrcode(containerId);
      
      let decodedText = null;
      
      try {
        // Scan QR code from uploaded file with timeout
        console.log("📷 Scanning QR code from file:", file.name);
        
        // Add timeout to prevent infinite hanging (8 seconds)
        const scanPromise = html5QrCode.scanFile(file, false); // showImage=false for hidden container
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout: Quét QR code mất quá nhiều thời gian.")), 8000)
        );
        
        decodedText = await Promise.race([scanPromise, timeoutPromise]);
        
        console.log("✅ QR Code scanned:", decodedText);
      } finally {
        // Always clean up the Html5Qrcode instance
        try {
          html5QrCode.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
        
        // Always remove container
        try {
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
        } catch (e) {
          // Ignore removal errors
        }
      }
      
      if (decodedText) {
        // Successfully scanned QR code
        setScanInput(decodedText);
        // Automatically process check-in
        await handleScanWithId(decodedText);
      } else {
        throw new Error("Không thể đọc QR code từ ảnh.");
      }
    } catch (err) {
      console.error("QR scan error:", err);
      let errorMsg = "Không thể đọc QR code từ ảnh.";
      
      const errMsg = err.message || err.toString() || "";
      
      if (errMsg.includes("Timeout") || errMsg.includes("timeout")) {
        errorMsg = "Quét QR code mất quá nhiều thời gian. Vui lòng thử lại với ảnh QR code rõ hơn.";
      } else if (errMsg.includes("No QR code") || errMsg.includes("not found") || errMsg.includes("No QR Code") || errMsg.includes("NotFoundException")) {
        errorMsg = "Không tìm thấy QR code trong ảnh. Vui lòng chọn ảnh QR code rõ hơn hoặc thử lại.";
      } else if (errMsg.includes("file") || errMsg.includes("File")) {
        errorMsg = "File ảnh không hợp lệ. Vui lòng thử lại với file ảnh khác.";
      } else if (errMsg.includes("element") || errMsg.includes("container")) {
        errorMsg = "Lỗi hệ thống. Vui lòng thử lại.";
      } else if (errMsg) {
        errorMsg += " Chi tiết: " + errMsg;
      }
      
      setError(errorMsg);
    } finally {
      setIsScanning(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await BackendAPI.updateTicketStatus(ticketId, newStatus);
    // Clear pending status change for this ticket
    setPendingStatusChanges(prev => {
      const updated = { ...prev };
      delete updated[ticketId];
      return updated;
    });
    loadData(false); // Refresh không hiển thị loading overlay
  };

  const handleStatusSelectChange = (ticketId, newStatus) => {
    // Store the pending status change
    setPendingStatusChanges(prev => ({
      ...prev,
      [ticketId]: newStatus
    }));
  };

  const handleApplyStatusChange = async (ticketId) => {
    const newStatus = pendingStatusChanges[ticketId];
    if (newStatus) {
      await handleStatusChange(ticketId, newStatus);
    }
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
      
      <div className={`container mx-auto px-4 sm:px-6 max-w-[1200px] py-4 sm:py-6 md:py-8 transition-all duration-300 ${
        isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'
      }`}>
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

              {/* Loading indicator for file scanning */}
              {isScanning && !html5QrCodeRef.current && (
                <div className="bg-blue-500/20 text-blue-100 p-3 sm:p-4 rounded mb-3 sm:mb-4 border border-blue-500/50 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm sm:text-base">Đang quét QR code từ ảnh...</span>
                  </div>
                </div>
              )}

              {/* QR Scanner - Camera view */}
              {/* Container must exist before starting scanner, so render it when isScanning is true */}
              {isScanning && (
                <div className="mb-4 sm:mb-6">
                  <div className="bg-black rounded-lg p-2 sm:p-4 mb-3 sm:mb-4 relative overflow-hidden">
                    {/* Loading indicator - shown outside container while scanner is initializing */}
                    {!html5QrCodeRef.current && (
                      <div className="w-full min-h-[300px] flex items-center justify-center bg-black rounded">
                        <div className="text-white text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">Đang khởi động camera...</p>
                        </div>
                      </div>
                    )}
                    {/* QR Scanner container - Html5Qrcode will render video here */}
                    {/* Keep container empty - Html5Qrcode will add its own elements */}
                    {/* Always render container, Html5Qrcode will populate it */}
                    <div 
                      ref={qrReaderContainerRef}
                      id="qr-reader" 
                      className="w-full"
                      style={{ 
                        minHeight: '300px',
                        position: 'relative',
                        backgroundColor: '#000'
                      }}
                    ></div>
                    {html5QrCodeRef.current && (
                      <button
                        onClick={stopQRScanner}
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 text-white px-2 sm:px-4 py-1 sm:py-2 rounded hover:bg-red-600 text-xs sm:text-sm z-20 shadow-lg"
                      >
                        Đóng
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Hidden container for file scanning (always present, even when camera not active) */}
              {!isScanning && <div id="qr-reader-file" className="hidden w-0 h-0"></div>}

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
                  {/* File Upload Button - Works on HTTP, can upload from gallery or take photo */}
                  <label className="px-3 sm:px-4 md:px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base py-2 sm:py-3 transition">
                    <Upload size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Tải ảnh QR</span>
                    <span className="sm:hidden">📷 QR</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
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
                                  loading="lazy" // Lazy load images
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
                            <div className="flex items-center gap-1 sm:gap-2">
                              <select
                                value={pendingStatusChanges[t.id] || t.status}
                                onChange={(e) =>
                                  handleStatusSelectChange(t.id, e.target.value)
                                }
                                className="bg-gray-700 text-white text-xs sm:text-sm rounded px-1 sm:px-2 py-1 border border-yellow-400 focus:ring-1 focus:ring-yellow-400 flex-1"
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
                              {(pendingStatusChanges[t.id] && pendingStatusChanges[t.id] !== t.status) && (
                                <button
                                  onClick={() => handleApplyStatusChange(t.id)}
                                  className="px-2 sm:px-3 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs sm:text-sm font-semibold rounded border border-yellow-500 transition-colors whitespace-nowrap"
                                  title="Áp dụng thay đổi"
                                >
                                  Áp Dụng
                                </button>
                              )}
                            </div>
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

      {/* Socket.IO Check-in Notification Popup */}
      {notificationTicket && (
        <CheckInNotification
          ticket={notificationTicket}
          onClose={() => setNotificationTicket(null)}
        />
      )}
    </div>
  );
};

export default AdminApp;
