
const express = require('express');
const app = express();
const port = 8000;
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
// const bootstrap = require('bootstrap');
const MongoStore = require('connect-mongo');

require('dotenv').config();


const { title } = require('process');
const methodOverride = require('method-override')
const Listing = require("./models/listing.js");             /////
// const Review = require("./models/review.js"); 

const listingRouter = require('./routes/listing.js');         /////
const userRouter = require('./routes/user.js');              /////

const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');                   

require('dotenv').config();
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET);

const wrapAsync = require('./utils/wrapAsync.js');
const ExpressError = require('./utils/ExpressError.js');
const { listingSchema,reviewSchema } = require("./schema.js");  ////

app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'))

app.engine('ejs', ejsMate);

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));

const MONGO_URL=process.env.ATLASDB_URL;

const sessionStore = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: 'mySuperSecreateKey'
    },
    touchAfter: 24 * 3600 // update session only once in 24 hrs if unchanged
});

async function createAdminUser() {
    const existingAdmin = await User.findOne({ username: "Admin" });
    
    if (!existingAdmin) {
        const adminUser = new User({name:"Admin",email:"admin@gmail.com",dob:"2004-01-01",licenseno:"admin12345",mobile:"9870127354", username: "Admin", role: "admin" });
        const registeredAdmin = await User.register(adminUser, "123");
        console.log("✅ Admin user created:", registeredAdmin);
    } else {
        console.log("⚠️ Admin user already exists.");
    }
}

async function main() {
    try {
        await mongoose.connect(process.env.ATLASDB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout in 5 seconds
        });
        console.log("✅ MongoDB Atlas Connected Successfully!");
        await createAdminUser();
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        process.exit(1); // Exit app if DB connection fails
    }
}
main();



const sessionOptions = {
    store: sessionStore,
    secret : "mySuperSecreateKey",
    resave : false,
    saveUninitialized : true,
    cookie : {
        expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge : 7 * 24 * 60 * 60 * 1000,
        httpOnly : true,
        secure: true, 
        sameSite: "lax"
    }
}


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

app.get("/", async (req, res) => {
    const listings = await Listing.find({});
    let rentedVehicles = [];
    if (req.user) {
        rentedVehicles = await Listing.find({ rented_by: req.user._id });
    }
    res.render("home.ejs", { listings, rentedVehicles, user: req.user });
});


app.use("/listings",listingRouter);
app.use("/",userRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(401,"Page Not Found !!!!"));
})

app.use((err,req,res,next)=>{
    let {statusCode = 500 ,message = "something went wrong"} = err;
    res.render("error.ejs",{statusCode,message});
})

app.listen(port,()=>{
    console.log("http://localhost:8000");
    console.log(MONGO_URL);
})