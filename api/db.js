// Database connection helper cho Vercel Serverless Functions
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_test?appName=ONFA";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: 'onfa_test'
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log("✅ Đã kết nối thành công tới MongoDB Cloud - Database: onfa_test");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Ticket Schema
const TicketSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  email: String,
  phone: String,
  dob: String,
  tier: String,
  paymentImage: String,
  status: { type: String, default: 'PENDING' },
  registeredAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

// Ticket Limits
const TICKET_LIMITS = {
  vvip: parseInt(process.env.VVIP_LIMIT || '5'),
  vip: parseInt(process.env.VIP_LIMIT || '10')
};

export { connectDB, Ticket, TICKET_LIMITS };
