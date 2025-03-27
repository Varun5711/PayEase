const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    title: {
        type: String,
        required: true,
        trim: true
    },
    
    message: {
        type: String,
        required: true,
        trim: true
    },
    
    type: {
        type: String,
        enum: ['success', 'info', 'warning', 'error'],
        default: 'info'
    },
    
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    
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
    
    actionUrl: {
        type: String,
        trim: true
    },
    
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    }
}, 
{
    timestamps: true, 
    
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

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

notificationSchema.statics.markAllAsRead = function(userId) {
    return this.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
    );
};

notificationSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({ userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
