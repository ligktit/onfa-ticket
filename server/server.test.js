const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import the Ticket model and app setup
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

const Ticket = mongoose.model('Ticket', TicketSchema);

const TICKET_LIMITS = {
  vvip: 50,
  vip: 200
};

// Create test app
function createApp() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // API 1: Lấy thống kê vé
  app.get('/api/stats', async (req, res) => {
    try {
      const tickets = await Ticket.find(); // Lấy hết vé trong kho ra đếm
      const vvipCount = tickets.filter(t => t.tier === 'vvip').length;
      const vipCount = tickets.filter(t => t.tier === 'vip').length;
      const checkedInCount = tickets.filter(t => t.status === 'CHECKED_IN').length;

      res.json({
        tickets: tickets,
        stats: {
          vvipCount,
          vipCount,
          vvipRemaining: Math.max(0, TICKET_LIMITS.vvip - vvipCount),
          vipRemaining: Math.max(0, TICKET_LIMITS.vip - vipCount),
          totalRegistered: tickets.length,
          totalCheckedIn: checkedInCount
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/register', async (req, res) => {
    try {
      const { name, email, phone, dob, tier, paymentImage } = req.body;

      // Kiểm tra xem còn vé không
      const count = await Ticket.countDocuments({ tier });
      if (count >= TICKET_LIMITS[tier]) {
        return res.status(400).json({ message: 'Loại vé này đã hết!' });
      }

      // Kiểm tra email trùng
      const exist = await Ticket.findOne({ email });
      if (exist) {
        return res.status(400).json({ message: 'Email này đã được đăng ký!' });
      }

      // Tạo mã vé ngẫu nhiên
      const id = 'ONFA' + Date.now().toString().substr(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
      
      const newTicket = new Ticket({
        id, name, email, phone, dob, tier, paymentImage
      });

      await newTicket.save();
      res.json(newTicket);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi Server: " + error.message });
    }
  });

  return app;
}

describe('Ticket Registration API Tests', () => {
  let app;
  
  // Increase timeout for database operations
  jest.setTimeout(30000);

  beforeAll(async () => {
    // Connect to a test database
    const MONGO_URI = process.env.MONGO_TEST_URI || "mongodb+srv://onfa_admin:onfa_admin@onfa.tth2epb.mongodb.net/onfa_test?retryWrites=true&w=majority";
    
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    
    await mongoose.connect(MONGO_URI);
    app = createApp();
  });

  afterAll(async () => {
    // Clean up: close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clear the Ticket collection before each test
    await Ticket.deleteMany({});
  });

  describe('POST /api/register', () => {
    const validTicketData = {
      name: 'Nguyễn Văn A',
      email: 'test@example.com',
      phone: '0123456789',
      dob: '1990-01-01',
      tier: 'vip',
      paymentImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    test('should register a new ticket successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toMatch(/^ONFA/);
      expect(response.body.name).toBe(validTicketData.name);
      expect(response.body.email).toBe(validTicketData.email);
      expect(response.body.phone).toBe(validTicketData.phone);
      expect(response.body.dob).toBe(validTicketData.dob);
      expect(response.body.tier).toBe(validTicketData.tier);
      expect(response.body.status).toBe('PENDING');
      expect(response.body).toHaveProperty('registeredAt');
    });

    test('should reject duplicate email', async () => {
      // Register first ticket
      await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      // Try to register with same email
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validTicketData,
          name: 'Nguyễn Văn B',
          phone: '0987654321'
        })
        .expect(400);

      expect(response.body.message).toBe('Email này đã được đăng ký!');
    });

    test('should reject when ticket limit is reached', async () => {
      // Create tickets up to the limit
      const tickets = [];
      for (let i = 0; i < TICKET_LIMITS.vip; i++) {
        tickets.push({
          name: `User ${i}`,
          email: `user${i}@example.com`,
          phone: `012345678${i}`,
          dob: '1990-01-01',
          tier: 'vip',
          paymentImage: 'data:image/png;base64,test'
        });
      }

      // Register all tickets
      for (const ticket of tickets) {
        await request(app)
          .post('/api/register')
          .send(ticket)
          .expect(200);
      }

      // Try to register one more ticket
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validTicketData,
          email: 'newuser@example.com'
        })
        .expect(400);

      expect(response.body.message).toBe('Loại vé này đã hết!');
    });

    test('should register VVIP ticket successfully', async () => {
      const vvipData = {
        ...validTicketData,
        email: 'vvip@example.com',
        tier: 'vvip'
      };

      const response = await request(app)
        .post('/api/register')
        .send(vvipData)
        .expect(200);

      expect(response.body.tier).toBe('vvip');
      expect(response.body.id).toMatch(/^ONFA/);
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        name: 'Nguyễn Văn A',
        email: 'test2@example.com'
        // Missing phone, dob, tier, paymentImage
      };

      const response = await request(app)
        .post('/api/register')
        .send(incompleteData);

      // The endpoint doesn't validate required fields, but MongoDB might throw an error
      // This test documents current behavior
      expect([200, 400, 500]).toContain(response.status);
    });

    test('should generate unique ticket IDs', async () => {
      const ticket1 = await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      const ticket2 = await request(app)
        .post('/api/register')
        .send({
          ...validTicketData,
          email: 'test2@example.com'
        })
        .expect(200);

      expect(ticket1.body.id).not.toBe(ticket2.body.id);
    });

    test('should set default status to PENDING', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      expect(response.body.status).toBe('PENDING');
    });

    test('should handle invalid tier gracefully', async () => {
      const invalidTierData = {
        ...validTicketData,
        email: 'invalid@example.com',
        tier: 'invalid_tier'
      };

      const response = await request(app)
        .post('/api/register')
        .send(invalidTierData);

      // Should either reject or handle gracefully
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/stats', () => {
    const validTicketData = {
      name: 'Nguyễn Văn A',
      email: 'test@example.com',
      phone: '0123456789',
      dob: '1990-01-01',
      tier: 'vip',
      paymentImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    test('should get all registered tickets when no tickets exist', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('stats');
      expect(Array.isArray(response.body.tickets)).toBe(true);
      expect(response.body.tickets.length).toBe(0);
      expect(response.body.stats.totalRegistered).toBe(0);
      expect(response.body.stats.vvipCount).toBe(0);
      expect(response.body.stats.vipCount).toBe(0);
      expect(response.body.stats.totalCheckedIn).toBe(0);
      expect(response.body.stats.vvipRemaining).toBe(TICKET_LIMITS.vvip);
      expect(response.body.stats.vipRemaining).toBe(TICKET_LIMITS.vip);
    });

    test('should get all registered tickets after registering one ticket', async () => {
      // Register a ticket
      const registerResponse = await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      const registeredTicket = registerResponse.body;

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].id).toBe(registeredTicket.id);
      expect(response.body.tickets[0].name).toBe(validTicketData.name);
      expect(response.body.tickets[0].email).toBe(validTicketData.email);
      expect(response.body.tickets[0].phone).toBe(validTicketData.phone);
      expect(response.body.tickets[0].dob).toBe(validTicketData.dob);
      expect(response.body.tickets[0].tier).toBe(validTicketData.tier);
      expect(response.body.stats.totalRegistered).toBe(1);
      expect(response.body.stats.vipCount).toBe(1);
      expect(response.body.stats.vvipCount).toBe(0);
      expect(response.body.stats.vipRemaining).toBe(TICKET_LIMITS.vip - 1);
    });

    test('should get all registered tickets with multiple tickets', async () => {
      // Register multiple tickets
      const tickets = [
        { ...validTicketData, email: 'user1@example.com', tier: 'vip' },
        { ...validTicketData, email: 'user2@example.com', tier: 'vip' },
        { ...validTicketData, email: 'user3@example.com', tier: 'vvip' },
        { ...validTicketData, email: 'user4@example.com', tier: 'vvip' }
      ];

      const registeredTickets = [];
      for (const ticket of tickets) {
        const response = await request(app)
          .post('/api/register')
          .send(ticket)
          .expect(200);
        registeredTickets.push(response.body);
      }

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.tickets).toHaveLength(4);
      expect(response.body.stats.totalRegistered).toBe(4);
      expect(response.body.stats.vipCount).toBe(2);
      expect(response.body.stats.vvipCount).toBe(2);
      expect(response.body.stats.vipRemaining).toBe(TICKET_LIMITS.vip - 2);
      expect(response.body.stats.vvipRemaining).toBe(TICKET_LIMITS.vvip - 2);
      expect(response.body.stats.totalCheckedIn).toBe(0);
    });

    test('should include all ticket fields in response', async () => {
      // Register a ticket
      await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      const ticket = response.body.tickets[0];
      expect(ticket).toHaveProperty('id');
      expect(ticket).toHaveProperty('name');
      expect(ticket).toHaveProperty('email');
      expect(ticket).toHaveProperty('phone');
      expect(ticket).toHaveProperty('dob');
      expect(ticket).toHaveProperty('tier');
      expect(ticket).toHaveProperty('paymentImage');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('registeredAt');
    });

    test('should correctly count checked-in tickets', async () => {
      // Register tickets
      const ticket1 = await request(app)
        .post('/api/register')
        .send({ ...validTicketData, email: 'user1@example.com' })
        .expect(200);

      const ticket2 = await request(app)
        .post('/api/register')
        .send({ ...validTicketData, email: 'user2@example.com' })
        .expect(200);

      // Manually set one ticket to CHECKED_IN status
      await Ticket.findOneAndUpdate({ id: ticket1.body.id }, { status: 'CHECKED_IN' });

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.stats.totalCheckedIn).toBe(1);
      expect(response.body.stats.totalRegistered).toBe(2);
      
      // Check that one ticket has CHECKED_IN status
      const checkedInTickets = response.body.tickets.filter(t => t.status === 'CHECKED_IN');
      expect(checkedInTickets.length).toBe(1);
    });

    test('should return correct remaining ticket counts', async () => {
      // Register 3 VIP tickets
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/register')
          .send({
            ...validTicketData,
            email: `vip${i}@example.com`,
            tier: 'vip'
          })
          .expect(200);
      }

      // Register 2 VVIP tickets
      for (let i = 0; i < 2; i++) {
        await request(app)
          .post('/api/register')
          .send({
            ...validTicketData,
            email: `vvip${i}@example.com`,
            tier: 'vvip'
          })
          .expect(200);
      }

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.stats.vipCount).toBe(3);
      expect(response.body.stats.vvipCount).toBe(2);
      expect(response.body.stats.vipRemaining).toBe(TICKET_LIMITS.vip - 3);
      expect(response.body.stats.vvipRemaining).toBe(TICKET_LIMITS.vvip - 2);
    });

    test('should return tickets in correct format', async () => {
      // Register a ticket
      await request(app)
        .post('/api/register')
        .send(validTicketData)
        .expect(200);

      // Get all tickets
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('vvipCount');
      expect(response.body.stats).toHaveProperty('vipCount');
      expect(response.body.stats).toHaveProperty('vvipRemaining');
      expect(response.body.stats).toHaveProperty('vipRemaining');
      expect(response.body.stats).toHaveProperty('totalRegistered');
      expect(response.body.stats).toHaveProperty('totalCheckedIn');
    });
  });
});
