// Cấu hình hiển thị (Dùng để tham chiếu text)
export const TIER_CONFIG = {
  vvip: {
    label: "Vé VIP",
    price: "150 OFT",
    benefits: [
      "Ưu tiên khu vực chỗ ngồi gần sân khấu với tầm nhìn bao quát",
      "Đặc biệt đi kèm trọn bộ quà tặng độc quyền và giá trị đến từ Mettitech và ONFA"
    ],
  },
  vip: {
    label: "Vé Superior",
    price: "100 OFT",
    benefits: ["Gói quà tặng tri ân từ Mettitech và ONFA"],
  },
};

// Secret key cho admin (có thể thay đổi)
export const ADMIN_SECRET_KEY = "ONFA123";

// Helper hiển thị tên vé
export const getTierName = (tier) => (tier === "vvip" ? "Vé VIP" : "Vé Superior");
