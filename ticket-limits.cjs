const parseLimit = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TICKET_LIMITS = {
  vvip: parseLimit(process.env.VVIP_LIMIT, 10),
  vip: parseLimit(process.env.VIP_LIMIT, 20)
};

module.exports = { TICKET_LIMITS };
