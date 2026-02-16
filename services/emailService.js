const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.gmail_user,
        pass: process.env.gmail_password
    }
});

exports.sendBookingConfirmation = async (userEmail, userName, eventDetails, bookingDetails) => {
    try {
        const mailOptions = {
            from: `"Smart Campus Event Team" <${process.env.gmail_user}>`,
            to: userEmail,
            subject: `🎟️ Ticket Confirmed: ${eventDetails.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
                        <h1 style="margin: 0;">Booking Confirmed!</h1>
                        <p style="margin-top: 5px;">Get ready for an amazing experience.</p>
                    </div>
                    
                    <div style="padding: 20px; background-color: #f9fafb;">
                        <p>Hi <strong>${userName}</strong>,</p>
                        <p>Your ticket for <strong>${eventDetails.title}</strong> has been successfully booked.</p>
                        
                        <div style="background-color: white; padding: 15px; border-radius: 8px; border-left: 5px solid #4f46e5; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #4f46e5;">Event Details</h3>
                            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${new Date(eventDetails.date).toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>📍 Venue:</strong> ${eventDetails.venue}</p>
                            <p style="margin: 5px 0;"><strong>💰 Price:</strong> ₹${eventDetails.price}</p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #1f2937; color: white; padding: 15px; display: inline-block; border-radius: 8px;">
                                <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Digital Pass Code</p>
                                <h2 style="margin: 5px 0; font-family: monospace; letter-spacing: 2px;">${bookingDetails.qrCode}</h2>
                            </div>
                            <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">Show this code at the entry gate.</p>
                        </div>

                        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                        
                        <p style="font-size: 12px; color: #6b7280; text-align: center;">
                            If you have any questions, please contact the event organizer.<br>
                            This is an automated message, please do not reply.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${userEmail}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};
