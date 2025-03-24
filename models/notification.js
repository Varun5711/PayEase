// models/Notification.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Notification Schema
 * Stores user notifications for the e-Rupee application
 */
const notificationSchema = new Schema({
    // User this notification belongs to
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Notification title
    title: {
        type: String,
        required: true,
        trim: true
    },
    
    // Notification message/body
    message: {
        type: String,
        required: true,
        trim: true
    },
    
    // Notification type (success, info, warning, error)
    type: {
        type: String,
        enum: ['success', 'info', 'warning', 'error'],
        default: 'info'
    },
    
    // Read status
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    
    // Optional related entity (e.g., transactionId, billPaymentId)
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['Transaction', 'BillPayment', 'User', 'Other'],
            default: 'Other'
        },
        entityId: {
            type: Schema.Types.ObjectId,
            refPath: 'relatedEntity.entityType'
        }
    },
    
    // Optional action URL for when notification is clicked
    actionUrl: {
        type: String,
        trim: true
    },
    
    // Metadata - can store any additional information
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    }
}, 
{
    timestamps: true, // Adds createdAt and updatedAt
    
    // Add virtual for calculating notification age
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Virtual for time since notification was created (for display purposes)
notificationSchema.virtual('timeSince').get(function() {
    const now = new Date();
    const diffTime = Math.abs(now - this.createdAt);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            if (diffMinutes < 1) {
                return 'Just now';
            }
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return this.createdAt.toLocaleDateString();
    }
});

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = function(userId) {
    return this.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
    );
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({ userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);