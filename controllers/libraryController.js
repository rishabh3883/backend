const Library = require('../models/Library');
const LibraryBooking = require('../models/LibraryBooking');

// --- Admin: Create Library ---
exports.createLibrary = async (req, res) => {
    try {
        const { name, totalSeats } = req.body;
        const library = new Library({ name, totalSeats });
        await library.save();
        res.status(201).json(library);
    } catch (err) {
        res.status(500).json({ message: "Failed to create library", error: err.message });
    }
};

// --- Admin: Delete Library ---
exports.deleteLibrary = async (req, res) => {
    try {
        const { id } = req.params;
        await Library.findByIdAndDelete(id);
        // Should we cancel all active bookings for this library? Ideally yes.
        await LibraryBooking.updateMany({ library: id, status: 'Active' }, { status: 'Cancelled' });
        res.json({ message: "Library deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete library", error: err.message });
    }
};

// --- Public: Get All Libraries ---
exports.getAllLibraries = async (req, res) => {
    try {
        const libraries = await Library.find();
        // Calculate available seats dynamically if needed, 
        // but for now we rely on the `bookedSeats` field in Library model which we'll keep in sync.
        res.json(libraries);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch libraries", error: err.message });
    }
};

// --- Student: Get My Active Booking ---
exports.getMyBooking = async (req, res) => {
    try {
        const booking = await LibraryBooking.findOne({ user: req.user.id, status: 'Active' }).populate('library');
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch booking", error: err.message });
    }
};

// --- Student: Book Slot ---
exports.bookSlot = async (req, res) => {
    try {
        const { libraryId, duration = 2 } = req.body; // Default 2 hours if not specified
        const userId = req.user.id;

        // 1. Check if user already has an active booking
        const existingBooking = await LibraryBooking.findOne({ user: userId, status: 'Active' });
        if (existingBooking) {
            return res.status(400).json({ message: "You already have an active study slot booked." });
        }

        // 2. Check Library Capacity (Atomic Check)
        const library = await Library.findById(libraryId);
        if (!library) return res.status(404).json({ message: "Library not found" });

        if (library.bookedSeats >= library.totalSeats) {
            return res.status(400).json({ message: "Library is full." });
        }

        // 3. Create Booking with End Time
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

        const booking = new LibraryBooking({
            user: userId,
            library: libraryId,
            status: 'Active',
            startTime,
            endTime
        });
        await booking.save();

        // 4. Update Library Count
        library.bookedSeats += 1;
        await library.save();

        res.status(201).json({ message: `Slot booked for ${duration} hours!`, booking });
    } catch (err) {
        res.status(500).json({ message: "Booking failed", error: err.message });
    }
};

// --- Student: Cancel Slot ---
exports.cancelSlot = async (req, res) => {
    try {
        const userId = req.user.id;
        const booking = await LibraryBooking.findOne({ user: userId, status: 'Active' });

        if (!booking) return res.status(404).json({ message: "No active booking found." });

        // 1. Update Booking Status
        booking.status = 'Cancelled';
        booking.endTime = Date.now(); // Override with actual end time
        await booking.save();

        // 2. Update Library Count
        const library = await Library.findById(booking.library);
        if (library) {
            library.bookedSeats = Math.max(0, library.bookedSeats - 1);
            await library.save();
        }

        res.json({ message: "Slot cancelled successfully." });
    } catch (err) {
        res.status(500).json({ message: "Cancellation failed", error: err.message });
    }
};

// --- Background Job: Check Expired Bookings ---
exports.checkExpiredBookings = async () => {
    try {
        const now = new Date();
        const expiredBookings = await LibraryBooking.find({ status: 'Active', endTime: { $lt: now } });

        for (const booking of expiredBookings) {
            booking.status = 'Completed';
            await booking.save();

            const library = await Library.findById(booking.library);
            if (library) {
                library.bookedSeats = Math.max(0, library.bookedSeats - 1);
                await library.save();
            }
        }

        if (expiredBookings.length > 0) {
            console.log(`Expired ${expiredBookings.length} bookings.`);
        }
    } catch (err) {
        console.error("Error checking expired bookings:", err);
    }
};
