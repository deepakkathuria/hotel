require("dotenv").config({ path: __dirname + "/../.env" });
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const { userDBPool } = require("./config/db");

// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);




// const upload = multer({ dest: "uploads/" });











const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});



app.post("/search-rooms", async (req, res) => {
  const { checkin, checkout } = req.body;

  try {
    const [rooms] = await userDBPool.query(
      `SELECT * FROM rooms WHERE id NOT IN (
        SELECT room_id FROM bookings
        WHERE (checkin <= ? AND checkout >= ?)
      )`,
      [checkout, checkin]
    );

    res.status(200).json({ availableRooms: rooms });
  } catch (error) {
    console.error("Room fetch error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});



app.post("/confirm-booking", async (req, res) => {
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


app.get("/booking-summary/:bookingId", async (req, res) => {
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



app.get("/available-room-types", async (req, res) => {
  try {
    const [rooms] = await userDBPool.query(`SELECT * FROM rooms ORDER BY id`);
    res.status(200).json({ rooms });
  } catch (error) {
    console.error("Error fetching room types:", error);
    res.status(500).json({ error: "Unable to fetch room types" });
  }
});
