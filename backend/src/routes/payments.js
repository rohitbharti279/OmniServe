const express = require('express');
const Razorpay = require('razorpay');
const { auth } = require('../middleware/auth');
const Booking = require('../models/Booking');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${bookingId}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    // Update booking with razorpay order ID
    await Booking.findByIdAndUpdate(bookingId, {
      razorpayOrderId: order.id
    });

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment order creation failed' });
  }
});

// Verify payment
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      // Payment successful
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        status: 'confirmed'
      });

      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      // Payment failed
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'failed'
      });

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

module.exports = router;