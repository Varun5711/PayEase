const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const { isLoggedIn } = require("../../middlewares/middleware");
const wrapAsync = require("../../utils/wrapAsync");

router.get("/", (req, res) => {
    res.render("pages/home/index.ejs");
});

router.get("/contact", isLoggedIn , (req, res) => {
    res.render("pages/home/contact.ejs");
});

router.post("/contact", isLoggedIn ,wrapAsync(async (req, res) => {
    const { name, email, message } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "your-email@gmail.com", 
            pass: "your-email-password" 
        }
    });

    let mailOptions = {
        from: email,
        to: "varunhotani@gmail.com",
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        req.flash("success", "Your message has been sent successfully!");
        res.redirect("/contact");
    } catch (error) {
        console.error("Email sending failed:", error);
        req.flash("error", "Failed to send your message. Try again later.");
        res.redirect("/contact");
    }
}));

router.get("/about" , (req , res) => {
    res.render("pages/home/about");
});

router.get("/contact", isLoggedIn , (req, res) => {
    res.render("pages/contact.ejs");
});

router.post("/contact", isLoggedIn ,wrapAsync(async (req, res) => {
    const { name, email, message } = req.body;

    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "your-email@gmail.com", 
            pass: "your-email-password" 
        }
    });

    let mailOptions = {
        from: email,
        to: "varunhotani@gmail.com",
        subject: `New Contact Form Submission from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        req.flash("success", "Your message has been sent successfully!");
        res.redirect("/contact");
    } catch (error) {
        console.error("Email sending failed:", error);
        req.flash("error", "Failed to send your message. Try again later.");
        res.redirect("/contact");
    }
}));

router.get("/features" , (req , res) => {
    res.render("pages/home/features");
});

module.exports = router;