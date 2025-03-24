const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose")


const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        required: true,
        default: 1000
    }
});

userSchema.plugin(passportLocalMongoose);
module.exports =  mongoose.model("User", userSchema);
