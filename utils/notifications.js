const User = require('../models/user');
const Notification = require('../models/notification.js');

/**
 * Send notification to a user
 * @param {string} userId - The user ID to send notification to
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, info, warning, error)
 * @param {string} template - Optional template name for email/push notification
 * @returns {Promise<Object>} - The created notification object
 */
const sendNotification = async (userId, title, message, type = 'info', template = null) => {
    try {
        // Create notification record
        const notification = new Notification({
            userId,
            title,
            message,
            type,
            isRead: false,
            createdAt: new Date()
        });
        
        // Save notification to database
        await notification.save();
        
        // Get user's notification preferences
        const user = await User.findById(userId);
        
        // Send push notification if enabled
        if (user && user.notificationPreferences?.pushEnabled) {
            await sendPushNotification(user.deviceTokens, {
                title,
                body: message,
                type,
                notificationId: notification._id
            });
        }
        
        // Send email notification if enabled
        if (user && user.notificationPreferences?.emailEnabled && template) {
            await sendEmailNotification(user.email, title, message, template);
        }
        
        return notification;
    } catch (err) {
        console.error('Error sending notification:', err);
        // Still return an object even if notification fails
        return {
            userId,
            title,
            message,
            type,
            error: err.message
        };
    }
};

/**
 * Send push notification to user devices
 * @param {Array} deviceTokens - User's device tokens
 * @param {Object} data - Notification data
 * @returns {Promise<void>}
 */
const sendPushNotification = async (deviceTokens, data) => {
    if (!deviceTokens || deviceTokens.length === 0) {
        return;
    }
    
    try {
        // Implementation depends on push notification service (Firebase, OneSignal, etc.)
        // This is a placeholder for the actual implementation
        
        const fcm = require('../services/firebaseMessaging');
        await fcm.sendToDevices(deviceTokens, {
            notification: {
                title: data.title,
                body: data.body
            },
            data: {
                type: data.type,
                notificationId: data.notificationId.toString()
            }
        });
        
        console.log(`Push notification sent to ${deviceTokens.length} devices`);
    } catch (err) {
        console.error('Error sending push notification:', err);
        // Don't throw - we want the function to continue even if push fails
    }
};

/**
 * Send email notification
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @param {string} template - Email template name
 * @returns {Promise<void>}
 */
const sendEmailNotification = async (email, subject, message, template) => {
    try {
        // Implementation depends on email service (Nodemailer, SendGrid, etc.)
        // This is a placeholder for the actual implementation
        
        const emailService = require('../services/emailService');
        await emailService.sendTemplatedEmail(email, subject, template, {
            subject,
            message,
            date: new Date().toLocaleString()
        });
        
        console.log(`Email notification sent to ${email}`);
    } catch (err) {
        console.error('Error sending email notification:', err);
        // Don't throw - we want the function to continue even if email fails
    }
};

/**
 * Get user's unread notifications
 * @param {string} userId - The user ID
 * @param {number} limit - Maximum number of notifications to retrieve
 * @returns {Promise<Array>} - Array of notification objects
 */
const getUnreadNotifications = async (userId, limit = 10) => {
    try {
        return await Notification.find({ userId, isRead: false })
            .sort({ createdAt: -1 })
            .limit(limit);
    } catch (err) {
        console.error('Error getting unread notifications:', err);
        return [];
    }
};

/**
 * Mark notification as read
 * @param {string} notificationId - The notification ID
 * @returns {Promise<boolean>} - Success status
 */
const markAsRead = async (notificationId) => {
    try {
        const result = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );
        return !!result;
    } catch (err) {
        console.error('Error marking notification as read:', err);
        return false;
    }
};

module.exports = {
    sendNotification,
    sendPushNotification,
    sendEmailNotification,
    getUnreadNotifications,
    markAsRead
};