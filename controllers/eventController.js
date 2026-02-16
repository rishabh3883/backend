const Event = require('../models/Event');
const Booking = require('../models/Booking');

const emailService = require('../services/emailService');

// --- Create Event (Admin) ---
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, venue, price, totalSeats, rules, organizer } = req.body;
        const newEvent = new Event({ title, description, date, venue, price, totalSeats, rules, organizer });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (err) {
        console.error("Error creating event:", err); // Log the error
        res.status(500).json({ message: "Failed to create event", error: err.message });
    }
};

// --- Get All Events (Public) ---
exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch events", error: err.message });
    }
};

// --- Book Event (Student) ---
exports.bookEvent = async (req, res) => {
    try {
        const { eventId, paymentId } = req.body;
        const userId = req.user.id; // From authMiddleware

        // Check Event Capacity
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (event.bookedSeats >= event.totalSeats) {
            return res.status(400).json({ message: "Event fully booked" });
        }

        // Check if already booked
        const existingBooking = await Booking.findOne({ userId, eventId, status: 'Confirmed' });
        if (existingBooking) {
            return res.status(400).json({ message: "You have already booked this event" });
        }

        // Create Booking
        const qrCode = `PASS-${userId}-${eventId}-${Date.now()}`;
        const booking = new Booking({ userId, eventId, paymentId, qrCode });
        await booking.save();

        // Update Event Stats
        event.bookedSeats += 1;
        await event.save();

        // Send Email Confirmation
        const userEmail = req.user.email; // Assuming email is in the token payload or need to fetch user
        // Fetch user details if not in token to be safe
        const User = require('../models/User');
        const user = await User.findById(userId);

        if (user) {
            await emailService.sendBookingConfirmation(user.email, user.name, event, booking);
        }

        res.status(201).json({ message: "Booking confirmed!", booking });
    } catch (err) {
        res.status(500).json({ message: "Booking failed", error: err.message });
    }
};

// --- Get My Bookings (Student) ---
exports.getMyBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).populate('eventId').sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch bookings", error: err.message });
    }
};

// --- Get Event Stats (Admin) ---
// Optional: returns list of attendees
exports.getEventAttendees = async (req, res) => {
    try {
        const { eventId } = req.params;
        const bookings = await Booking.find({ eventId }).populate('userId', 'name email enrollmentNumber');
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch attendees", error: err.message });
    }
};
