// models/BillPayment.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const billPaymentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    billType: {
        type: String,
        required: true,
        enum: ['electricity', 'water', 'internet', 'mobile', 'gas', 'tax']
    },
    provider: {
        type: String,
        required: true
    },
    consumerNumber: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    transactionId: {
        type: Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Paid', 'Failed'],
        default: 'Pending'
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    receiptNumber: {
        type: String
    },
    rewardsEarned: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

// Index for faster queries
billPaymentSchema.index({ userId: 1, paymentDate: -1 });
billPaymentSchema.index({ provider: 1, consumerNumber: 1 });

module.exports = mongoose.model('BillPayment', billPaymentSchema);