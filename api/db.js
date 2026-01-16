// Database connection helper cho Vercel Serverless Functions
import mongoose from 'mongoose';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { TICKET_LIMITS } = require('../ticket-limits.cjs');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGO_URL ||
  "mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_events?appName=ONFA";

let cached = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGO_URI) {
      throw new Error('Missing MongoDB connection string (MONGO_URI)');
    }

    const opts = {
      bufferCommands: false,
      dbName: 'onfa_events',
      serverSelectionTimeoutMS: 5000, // Reduced from 10s to 5s for faster failure detection
      connectTimeoutMS: 5000, // Reduced from 10s to 5s
      maxPoolSize: 10, // Increased from 5 to 10 for better concurrency
      minPoolSize: 2, // Keep minimum connections alive
      maxIdleTimeMS: 30000, // Close idle connections after 30s
      socketTimeoutMS: 45000 // Socket timeout
    };

    cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
      console.log("✅ Đã kết nối thành công tới MongoDB Cloud - Database: onfa_events");
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

// Ticket Schema with indexes for performance
const TicketSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  name: String,
  email: { type: String, index: true }, // Index for email lookups
  phone: String,
  dob: String,
  tier: { type: String, index: true }, // Index for tier filtering
  paymentImage: String,
  qrCodeDataURL: String, // QR code image (Base64 Data URL)
  status: { type: String, default: 'PENDING', index: true }, // Index for status filtering
  registeredAt: { type: Date, default: Date.now, index: true } // Index for sorting
});

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);

export { connectDB, Ticket, TICKET_LIMITS };
