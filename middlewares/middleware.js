module.exports.isLoggedIn = (req , res , next) => {
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("error" , "You must be logged in!");
        return res.redirect("/login");
    }
    next();
}

module.exports.preventLoggedInUsers = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash("info", "You are already logged in");
        return res.redirect("/dashboard"); // Redirect to a dashboard or home page
    }
    next();
}

module.exports.saveRedirectUrl = (req , res , next) => {
    if(req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl
    } 
    next();
}