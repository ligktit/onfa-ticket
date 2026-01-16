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
const fetchWithTimeout = (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⏱️ Request timeout after ${timeout}ms: ${url}`);
    controller.abort();
  }, timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then(response => {
      clearTimeout(timeoutId);
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: Server không phản hồi sau ${timeout/1000} giây`);
      }
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
      const response = await fetch(
        `${API_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ticketData),
        }
      );
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Đăng ký thất bại");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Lỗi registerTicket:", error);
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  checkIn: async (ticketId) => {
    try {
      const response = await fetchWithTimeout(
        `${API_URL}/checkin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId }),
        },
        10000
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


  updateTicketStatus: async (ticketId, newStatus) => {
    try {
      console.log(`🔄 Updating ticket ${ticketId} to status: ${newStatus}`);
      console.log(`🔗 API URL: ${API_URL}/update-status`);
      
      const response = await fetchWithTimeout(
        `${API_URL}/update-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId, status: newStatus }),
        },
        10000
      );
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = "Cập nhật thất bại";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error(`❌ Server error (${response.status}):`, errorData);
        } catch (e) {
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
      const response = await fetchWithTimeout(
        `${API_URL}/ticket-image?ticketId=${encodeURIComponent(ticketId)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        10000
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
