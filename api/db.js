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
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      maxPoolSize: 5
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

export { connectDB, Ticket, TICKET_LIMITS };
