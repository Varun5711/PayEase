require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const ejsMate = require("ejs-mate");
const flash = require("connect-flash");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const User = require("./models/user.js");

const authRouter = require("./routes/auth/auth.js");
const homeRouter = require("./routes/home/home.js");
const dashboardRouter = require("./routes/dashboard/dashboard.js");

const MONGO_URL = process.env.MONGO_URL;

async function main() {
    mongoose.connect(MONGO_URL);
}

main().then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.log(err);
});

const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: process.env.SECRET
    },
    touchAfter: 24 * 3600
});

store.on("error",  (e) => {
    console.log("Session Store Error", e);
});

const sessionOptions = {
    store,
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.engine('ejs', ejsMate);

// ✅ Move session middleware ABOVE Passport
app.use(session(sessionOptions)); // Session must be initialized first
app.use(flash());

// ✅ Initialize Passport AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

// ✅ Configure Passport Local Strategy
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ✅ Ensure user is stored in `res.locals`
app.use((req, res, next) => {
    res.locals.successMsg = req.flash("success");
    res.locals.errorMsg = req.flash("error");
    res.locals.currentUser = req.user || null; // Prevents `undefined` issues
    next();
});

app.use("/", homeRouter);
app.use("/", authRouter);
app.use("/", dashboardRouter);

app.listen(3000);