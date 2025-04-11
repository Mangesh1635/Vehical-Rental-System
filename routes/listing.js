const express = require('express');
const router = express.Router();
const Listing = require("../models/listing.js");
const moment = require("moment");

const wrapAsync = require('../utils/wrapAsync.js');
const ExpressError = require('../utils/ExpressError.js');
const { listingSchema } = require("../schema.js");
const {isLoggedin} = require("../middleware.js");

require('dotenv').config();


const multer = require("multer");
const { storage } = require("../cloudconfig");
const upload = multer({ storage: storage }); // Explicitly set storage

const validateListing =(req,res,next)=>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        const msg = error.details.map(e => e.message).join(", ");
        throw new ExpressError(400,msg);
    }
    next();
}

//index route
router.get("/car",wrapAsync(async (req,res)=>{
    let alllisting = await Listing.find({ category: "car" });
    
    alllisting = alllisting.reverse(); 
    res.render("listings/index.ejs",{alllisting});
}));
router.get("/bike",wrapAsync(async (req,res)=>{
    let alllisting =  await Listing.find({ category: "bike" });
    alllisting = alllisting.reverse(); 
    res.render("listings/index.ejs",{alllisting});
}));
router.get("/scooty",wrapAsync(async (req,res)=>{
    let alllisting =  await Listing.find({ category: "scooty"});
    alllisting = alllisting.reverse(); 
    res.render("listings/index.ejs",{alllisting});
}));

//new list route
router.get("/new",isLoggedin,(req,res)=>{
    res.render("listings/new.ejs");
})

//create new list item route
router.post("/",isLoggedin,upload.single("listing[image_url]"),wrapAsync(async(req,res,next)=>{
    // let {title,description,price,location,country,image} = req.body; 
        const newList =  new Listing(req.body.listing);
        let url = req.file.path;
        let filename = req.file.filename;
        // console.log(req.body.listing.category);
        newList.category = req.body.listing.category;
        newList.noPlate = req.body.listing.noPlate; 
        newList.image_url = {url,filename};
        console.log(newList);
        console.log(newList.fule_type);
        await newList.save();
        req.flash("success","New Listing Created");
        res.redirect("/");
}));

//show route
router.get("/:id",wrapAsync(async (req,res)=>{
    const {id} = req.params;
    const list = await Listing.findById(id);

    if(!list){
        req.flash("error","Listing you requesed for does not exist !" );
        res.redirect("/");
     }

     const user = req.user;
     console.log(user)
     console.log(list);
    res.render("listings/show.ejs",{list,user});
    
}));

// edit route
router.get("/:id/edit",isLoggedin,wrapAsync(async (req,res)=>{
    const {id}= req.params;
    const list = await Listing.findById(id);
    if(!list){
        req.flash("error","Listing you requesed for does not exist !" );
        res.redirect("/");
     }
    res.render("listings/edit.ejs",{list});
}));

//Update route
// router.put("/:id",validateListing,upload.single("image_url"),isLoggedin,wrapAsync(async (req,res)=>{
//     console.log(req.body);

//     if(!req.body || Object.keys(req.body).length === 0){
//     throw new ExpressError(400,"Send Valid Data for Listing");
// }

//     const {id} = req.params;
//     const updatedList = req.body;
//     let listing = await Listing.findByIdAndUpdate(id, updatedList, { new: true });


    // if(typeof req.file !== "undefined"){
    //     let url = req.file.path;
    //     let filename = req.file.filename;
    //     listing.image_url = {url,filename};
    //     await listing.save();
    // }

    // req.flash("success","Listing Updated");
    // res.redirect(`/listings/${id}`);
// }));

router.put(
    "/:id",
    
    upload.single("image_url"),
    isLoggedin,
    wrapAsync(async (req, res) => {
      console.log("Full body:", req.body);
  
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new ExpressError(400, "Send Valid Data for Listing");
      }
  
      const { id } = req.params;
      const updatedList = req.body;
  
      let listing = await Listing.findByIdAndUpdate(id, updatedList, { new: true });
  
      if (req.file) {
        const url = req.file.path;
        const filename = req.file.filename;
        listing.image_url = { url, filename };
        await listing.save();
      }
  
      req.flash("success", "Listing Updated");
      res.redirect(`/listings/${id}`);
    })
  );
  

// delete route
router.delete("/:id",isLoggedin,wrapAsync(async (req,res)=>{
    const {id} = req.params;
    const del = await Listing.findByIdAndDelete(id);
    req.flash("success","Listing Deleted");
    res.redirect("/");
}));

//Rent Vehical
router.post("/:id/rent", isLoggedin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const rent = await Listing.findById(id);

    if (!rent) {
        return res.status(404).json({ message: "Vehicle not found" });
    }
    if (rent.status === "Available") {
        rent.status = "Rented";
        rent.rented_by = req.user._id;
        rent.rented_at = new Date(); // ✅ Ensure this is set properly
        await rent.save();

        console.log("Vehicle rented at:", rent.rented_at); // ✅ Debugging log
    } else {
        return res.redirect(`/listings/${id}`);
    }

    res.redirect(`/listings/${id}`);
}));

//return route
router.post("/:id/return", isLoggedin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const rent = await Listing.findById(id);

    if (!rent || rent.status !== "Rented") {
        return res.status(404).json({ message: "Vehicle not found or not rented" });
    }
    console.log("Stored rented_at:", rent.rented_at); // ✅ Debugging log

    const startTime = moment(rent.rented_at);
    const endTime = moment();

    console.log("Start Time:", startTime.format("YYYY-MM-DD HH:mm:ss"));
    console.log("End Time:", endTime.format("YYYY-MM-DD HH:mm:ss"));

    const durationMinutes = endTime.diff(startTime, "minutes"); // ✅ Calculate duration in minutes.

    const perDayRate = rent.rental_price;
    const perHourRate = perDayRate/24;
    const perMinuteRate = perHourRate / 60; // ✅ Calculate per-minute price

    const totalCost = Math.ceil(durationMinutes * perMinuteRate); // ✅ Round up cost
    console.log(`Duration: ${durationMinutes} min, Cost: ₹${totalCost}`);

    res.render("return.ejs", { rent, totalCost, durationMinutes });
}));


//payment route 
router.post("/:id/confirm-return", isLoggedin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const rent = await Listing.findById(id);
    
    if (!rent || !rent.rented_by || rent.rented_by.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    // Reset vehicle status
    rent.status = "Available";
    rent.rented_by = null;
    rent.rental_start_time = null;

    await rent.save();
    res.redirect("/");
}));


module.exports = router;