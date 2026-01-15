// Cấu hình hiển thị (Dùng để tham chiếu text)
export const TIER_CONFIG = {
  vvip: {
    label: "VIP A",
    price: "100 OFT",
    benefits: ["Ưu tiên chỗ ngồi", "Bộ quà tặng đặc biệt từ METTITECH và ONFA"],
  },
  vip: {
    label: "VIP B",
    price: "50 OFT",
    benefits: ["Bộ quà tặng đặc biệt từ METTITECH và ONFA"],
  },
};

// Secret key cho admin (có thể thay đổi)
export const ADMIN_SECRET_KEY = "ONFA123";

// Helper hiển thị tên vé
export const getTierName = (tier) => (tier === "vvip" ? "VIP A" : "VIP B");
