require("dotenv").config({ path: __dirname + "/../.env" });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const { userDBPool } = require("./config/db");

const moment = require('moment');

const app = express();
app.use(express.json());
// app.use(cors({
//   origin: ['https://radharidhani.in'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));



app.use(cors({
  origin: ['https://radharidhani.in', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// const allowedOrigins = ['http://localhost:5173', 'https://radharidhani.in'];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('CORS not allowed from this origin'));
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));

// Also allow preflight requests
app.options('*', cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});


app.get("/api", (req, res) => {
  res.send("✅ Hotel Booking API is running!");
});


  app.post("/api/search-rooms", async (req, res) => {
    const { checkin, checkout, adults, children } = req.body;

    if (!checkin || !checkout || adults == null || children == null) {
      return res.status(400).json({ error: "Check-in, check-out, adults, and children are required" });
    }

    try {
      const [rooms] = await userDBPool.query(
        `SELECT r.*
        FROM rooms r
        WHERE r.max_adults >= ? AND r.max_children >= ?
        AND (
          SELECT COUNT(*) FROM bookings b
          WHERE b.room_id = r.id
          AND (b.checkin < ? AND b.checkout > ?)
        ) < r.total_inventory`,
        [adults, children, checkout, checkin]
      );

      res.status(200).json({ availableRooms: rooms });
    } catch (error) {
      console.error("❌ Search rooms error:", error);
      res.status(500).json({ error: "Failed to fetch available rooms" });
    }
  });






app.post("/api/confirm-booking", async (req, res) => {
  try {
    const {
      checkin,
      checkout,
      room_id,
      adults,
      children,
      full_name,
      email,
      mobile,
      gst_number,
      special_request,
      addons,
      subtotal,
      tax,
      total
    } = req.body;

    // STEP 1: Check overlapping bookings
    const [booked] = await userDBPool.query(
      `SELECT COUNT(*) AS count FROM bookings
       WHERE room_id = ?
       AND (
         (checkin < ? AND checkout > ?)
       )`,
      [room_id, checkout, checkin]
    );

    const bookedCount = booked[0]?.count || 0;

    // STEP 2: Get room's total inventory
    const [roomData] = await userDBPool.query(
      `SELECT total_inventory FROM rooms WHERE id = ?`,
      [room_id]
    );

    const totalInventory = roomData[0]?.total_inventory || 0;

    // STEP 3: Check availability
    if (bookedCount >= totalInventory) {
      return res.status(400).json({ error: "Room is not available for the selected dates." });
    }

    // STEP 4: Proceed with booking
    const query = `
      INSERT INTO bookings (
        checkin, checkout, room_id, adults, children,
        full_name, email, mobile, gst_number, special_request,
        addons, subtotal, tax, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await userDBPool.query(query, [
      checkin,
      checkout,
      room_id,
      adults,
      children,
      full_name,
      email,
      mobile,
      gst_number || null,
      special_request || null,
      JSON.stringify(addons || []),
      subtotal,
      tax,
      total
    ]);

    res.status(201).json({ message: "Booking successful!" });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ error: "Failed to confirm booking" });
  }
});


app.get("/api/booking-summary/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    const [rows] = await userDBPool.query(
      `SELECT b.*, r.room_type, r.base_price FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = rows[0];
    booking.addons = JSON.parse(booking.addons || "[]");

    res.status(200).json({ booking });
  } catch (error) {
    console.error("Booking summary error:", error);
    res.status(500).json({ error: "Failed to fetch booking details" });
  }
});



app.get("/api/available-room-types", async (req, res) => {
  try {
    const [rows] = await userDBPool.query(`SELECT * FROM rooms ORDER BY id`);

    const formattedRooms = rows.map((room) => {
      let addons = [];
      try {
        addons = typeof room.addons === "string"
          ? JSON.parse(room.addons)
          : room.addons;
      } catch (e) {
        addons = [];
      }

      return {
        ...room,
        addons,
      };
    });

    res.status(200).json({
      status: 200,
      message: "Room types fetched successfully",
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error("❌ Error fetching room types:", error);
    res.status(500).json({ status: 500, error: "Unable to fetch room types" });
  }
});










app.post("/api/available-room-types/by-date", async (req, res) => {
  const { checkin, checkout, adults, children } = req.body;

  if (!checkin || !checkout || adults == null || children == null) {
    return res.status(400).json({ status: 400, error: "Check-in, check-out, adults, and children are required" });
  }

  try {
    const [rows] = await userDBPool.query(
      `SELECT * FROM rooms
       WHERE max_adults >= ? AND max_children >= ?
       AND id NOT IN (
         SELECT room_id FROM bookings
         WHERE (checkin < ? AND checkout > ?)
       )
       ORDER BY id`,
      [adults, children, checkout, checkin]
    );

    const formattedRooms = rows.map((room) => {
      let addons = [];
      try {
        addons = typeof room.addons === "string" ? JSON.parse(room.addons) : room.addons;
      } catch (e) {
        addons = [];
      }

      return {
        ...room,
        addons,
      };
    });

    res.status(200).json({
      status: 200,
      message: "Available rooms fetched successfully",
      availableRooms: formattedRooms,
    });
  } catch (error) {
    console.error("❌ Error checking available rooms by date:", error);
    res.status(500).json({ status: 500, error: "Failed to fetch available rooms" });
  }
});







app.delete("/api/rooms/:id", async (req, res) => {
  const roomId = req.params.id;
  try {
    await userDBPool.query("DELETE FROM rooms WHERE id = ?", [roomId]);
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    console.error("Delete Room Error:", error);
    res.status(500).json({ error: "Failed to delete room" });
  }
});



app.put("/api/rooms/:id", async (req, res) => {
  const { room_type, base_price, addons } = req.body;
  const { id } = req.params;

  await userDBPool.query(
    "UPDATE rooms SET room_type = ?, base_price = ?, addons = ? WHERE id = ?",
    [room_type, base_price, JSON.stringify(addons), id]
  );

  res.status(200).json({ message: "Room updated successfully" });
});



app.post("/api/rooms", async (req, res) => {
  try {
    const { room_type, base_price, addons } = req.body;
    await userDBPool.query(
      `INSERT INTO rooms (room_type, base_price, addons) VALUES (?, ?, ?)`,
      [room_type, base_price, JSON.stringify(addons || [])]
    );
    res.status(201).json({ message: "Room added successfully" });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({ error: "Failed to create room" });
  }
});



app.get("/api/rooms/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await userDBPool.query(`SELECT * FROM rooms WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: "Room not found" });

    const room = rows[0];
    room.addons = JSON.parse(room.addons || "[]");

    res.status(200).json({ room });
  } catch (error) {
    console.error("Fetch room error:", error);
    res.status(500).json({ error: "Failed to fetch room" });
  }
});



app.get("/api/bookings", async (req, res) => {
  try {
    const [rows] = await userDBPool.query(`SELECT * FROM bookings ORDER BY id DESC`);
    res.status(200).json({ bookings: rows });
  } catch (err) {
    console.error("❌ Fetch bookings error:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});






app.get('/api/booking-summary-dashboard', async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');

    const [todayBookings] = await userDBPool.query(
      'SELECT COUNT(*) AS count FROM bookings WHERE DATE(checkin) = ?', [today]
    );

    const [tomorrowBookings] = await userDBPool.query(
      'SELECT COUNT(*) AS count FROM bookings WHERE DATE(checkin) = ?', [tomorrow]
    );

    const [upcomingBookings] = await userDBPool.query(
      'SELECT COUNT(*) AS count FROM bookings WHERE DATE(checkin) >= ?', [today]
    );

    res.json({
      today: todayBookings[0].count,
      tomorrow: tomorrowBookings[0].count,
      totalUpcoming: upcomingBookings[0].count
    });
  } catch (err) {
    console.error('📛 Dashboard Booking Error:', err);
    res.status(500).json({ error: 'Dashboard booking summary failed' });
  }
});
