// Cấu hình hiển thị (Dùng để tham chiếu text)
export const TIER_CONFIG = {
  supervip: {
    label: "Vé Super VIP",
    price: "1000 OFT",
    benefits: [
      "Khu vực chỗ ngồi VIP nhất, ngay sát sân khấu với tầm nhìn tuyệt đối",
      "Trọn bộ quà tặng cao cấp và độc quyền từ Mettitech và ONFA",
      "Ưu tiên đặc biệt trong các hoạt động và sự kiện"
    ],
  },
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
export const getTierName = (tier) => {
  if (tier === "supervip") return "Vé Super VIP";
  if (tier === "vvip") return "Vé VIP";
  return "Vé Superior";
};
