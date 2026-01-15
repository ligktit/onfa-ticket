// Cấu hình URL Backend
// Sử dụng environment variable hoặc fallback về localhost cho development
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

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
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

// API Service
export const BackendAPI = {
  fetchData: async () => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/stats`, {}, 10000);
      if (!response.ok) {
        throw new Error("Lỗi kết nối server");
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi fetchData:", error);
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },

  registerTicket: async (ticketData) => {
    try {
      const response = await fetchWithTimeout(
        `${API_URL}/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ticketData),
        },
        15000 // Timeout 15 giây cho đăng ký
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
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Cập nhật thất bại");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Lỗi updateTicketStatus:", error);
      if (isConnectionError(error)) {
        throw new Error("Không thể kết nối đến Server. Vui lòng thử lại sau");
      }
      throw error;
    }
  },
};
