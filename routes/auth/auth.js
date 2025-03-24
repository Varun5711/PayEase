const express = require("express");
const router = express.Router();
const passport = require("passport");
const { saveRedirectUrl , preventLoggedInUsers } = require("../../middlewares/middleware");
const wrapAsync = require("../../utils/wrapAsync");
const User = require("../../models/user.js");

router.get("/login", (req, res) => {
    res.render("pages/auth/login.ejs");
});

router.post("/login", saveRedirectUrl , passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}), (req, res) => {
    req.flash("success", `Welcome back, ${req.user?.username || "Unknown User"}!`);
    let url = res.locals.redirectUrl;
    if(url) {
        res.redirect(url);
    } else {
        res.redirect("/");
    }
});

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
    });
    req.flash("success", "You are logged Out");
    res.redirect("/");
});

router.get("/signup" , preventLoggedInUsers , (req, res) => {
    res.render("pages/auth/signup.ejs")
});

router.post("/signup", wrapAsync(async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        const newUser = new User({ username, email });

        let registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            req.flash("success", "Welcome to E-rupee!");
            res.redirect("/");
        });
    } catch (err) {
        console.error("Signup Error:", err);
        req.flash("error", err.message);
        res.redirect("/signup");
    }
}));


module.exports = router;