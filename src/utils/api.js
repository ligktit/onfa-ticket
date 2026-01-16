// Cấu hình URL Backend
// Auto-detect network IP when accessed from phone, otherwise use localhost
function getApiUrl() {
  // If environment variable is set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In production, use relative URL
  if (!import.meta.env.DEV) {
    return "/api";
  }
  
  // In dev mode: if accessing from network IP (phone), use network IP for API
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Accessed from network IP (phone) - use same IP for backend
    return `http://${hostname}:5000/api`;
  }
  
  // Accessed from localhost (computer) - use localhost
  return "http://localhost:5000/api";
}

const API_URL = getApiUrl();

// Debug: Log API URL for troubleshooting
if (import.meta.env.DEV) {
  console.log(`🔗 API URL: ${API_URL}`);
  console.log(`📍 Hostname: ${window.location.hostname}`);
}

// Helper function để kiểm tra lỗi kết nối
const isConnectionError = (error) => {
  return (
    error instanceof TypeError ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError") ||
    error.message.includes("Network request failed") ||
    error.name === "AbortError"
  );
};

// Helper function để tạo timeout cho fetch
// Đảm bảo request đợi server phản hồi đầy đủ, không timeout sớm
const fetchWithTimeout = (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  let timeoutId = null;
  
  // Set timeout - chỉ abort nếu server không phản hồi trong thời gian quy định
  timeoutId = setTimeout(() => {
    console.warn(`⏱️ Request timeout after ${timeout}ms: ${url}`);
    console.warn(`⚠️ Server không phản hồi, đang hủy request...`);
    controller.abort();
  }, timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then(response => {
      // Clear timeout khi nhận được response (dù OK hay không OK)
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Log response status để debug
      if (!response.ok) {
        console.warn(`⚠️ Server response not OK: ${response.status} ${response.statusText} for ${url}`);
      }
      
      return response;
    })
    .catch(error => {
      // Clear timeout khi có lỗi
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Xử lý các loại lỗi khác nhau
      if (error.name === 'AbortError') {
        console.error(`❌ Request aborted due to timeout: ${url}`);
        throw new Error(`Request timeout: Server không phản hồi sau ${timeout/1000} giây. Vui lòng kiểm tra kết nối mạng và thử lại.`);
      }
      
      // Log lỗi để debug
      console.error(`❌ Fetch error for ${url}:`, error);
      throw error;
    });
};

// API Service
export const BackendAPI = {
  fetchData: async () => {
    try {
      console.log(`🔗 Fetching from: ${API_URL}/stats`);
      const startTime = Date.now();
      
      const response = await fetchWithTimeout(`${API_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 30000); // 30 second timeout
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ Request completed in ${duration}ms`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Response not OK. Status: ${response.status}, Body:`, errorText);
        throw new Error(`Lỗi kết nối server: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Response received:`, { 
        tickets: data.tickets?.length || 0, 
        stats: data.stats 
      });
      return data;
    } catch (error) {
      console.error("❌ Lỗi fetchData:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message
      });
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  registerTicket: async (ticketData) => {
    try {
      console.log(`🔄 Registering ticket for: ${ticketData.email}`);
      console.log(`🔗 API URL: ${API_URL}/register`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ticketData),
        },
        60000 // 60 second timeout (for large image uploads)
      );
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Đăng ký thất bại");
      }
      
      const result = await response.json();
      console.log(`✅ Ticket registered successfully`);
      return result;
    } catch (error) {
      console.error("❌ Lỗi registerTicket:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message
      });
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  checkIn: async (ticketId) => {
    try {
      console.log(`🔄 Checking in ticket: ${ticketId}`);
      console.log(`🔗 API URL: ${API_URL}/checkin`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId }),
        },
        30000 // 30 second timeout (server may send webhook)
      );
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Check-in thất bại");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Lỗi checkIn:", error);
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },


  updateTicketTier: async (ticketId, newTier) => {
    try {
      console.log(`🔄 Updating ticket ${ticketId} tier to: ${newTier}`);
      console.log(`🔗 API URL: ${API_URL}/update-status`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, tier: newTier }),
        },
        60000 // 60 second timeout (server may need time for processing)
      );
      
      if (!response.ok) {
        let errorMessage = "Cập nhật thất bại";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error(`❌ Server error (${response.status}):`, errorData);
        } catch {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ Server error (${response.status}):`, errorText);
          errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log(`✅ Ticket tier updated successfully`);
      return data;
    } catch (error) {
      console.error("❌ Lỗi updateTicketTier:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  updateTicketStatusAndTier: async (ticketId, newStatus, newTier) => {
    try {
      console.log(`🔄 Updating ticket ${ticketId} status to: ${newStatus}, tier to: ${newTier}`);
      console.log(`🔗 API URL: ${API_URL}/update-status`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, status: newStatus, tier: newTier }),
        },
        60000 // 60 second timeout (server may send email if status=PAID, needs more time)
      );
      
      if (!response.ok) {
        let errorMessage = "Cập nhật thất bại";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error(`❌ Server error (${response.status}):`, errorData);
        } catch {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ Server error (${response.status}):`, errorText);
          errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log(`✅ Ticket status and tier updated successfully`);
      return data;
    } catch (error) {
      console.error("❌ Lỗi updateTicketStatusAndTier:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  updateTicketStatus: async (ticketId, newStatus) => {
    try {
      console.log(`🔄 Updating ticket ${ticketId} to status: ${newStatus}`);
      console.log(`🔗 API URL: ${API_URL}/update-status`);
      
      // Use longer timeout if status is PAID (server needs to send email)
      const timeout = newStatus === 'PAID' ? 60000 : 30000; // 60s for PAID (email), 30s for others
      
      const response = await fetchWithTimeout(
        `${API_URL}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, status: newStatus }),
        },
        timeout
      );
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Cập nhật thất bại";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error(`❌ Server error (${response.status}):`, errorData);
        } catch {
          const errorText = await response.text().catch(() => '');
          console.error(`❌ Server error (${response.status}):`, errorText);
          errorMessage = errorText || `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log(`✅ Ticket status updated successfully`);
      return data;
    } catch (error) {
      console.error("❌ Lỗi updateTicketStatus:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  // Lazy load payment image on-demand
  getTicketImage: async (ticketId) => {
    try {
      console.log(`🔄 Loading image for ticket: ${ticketId}`);
      console.log(`🔗 API URL: ${API_URL}/ticket-image`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/ticket-image?ticketId=${encodeURIComponent(ticketId)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        30000 // 30 second timeout (for large image downloads)
      );
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Không thể tải ảnh");
      }
      
      const data = await response.json();
      return data.paymentImage;
    } catch (error) {
      console.error("Lỗi getTicketImage:", error);
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },
};
