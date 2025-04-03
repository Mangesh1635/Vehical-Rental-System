const { ref } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    brand : {
        type : String,
        required : true
    },
    model:{
        type : String,
        required : true
    },
    description : String ,
    rental_price : Number,
    image_url : {
        url: String,
        filename: String,
    },
    category : {
        type : String,
        required : true
    },noPlate : {
        type : String,
        required : true
    },
    status: {  
        type: String,  
        enum: ["Available", "Rented"],  // Only allow "Available" or "Rented"
        default: "Available"  // Default status is "Available"
    },
    rented_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      rented_at: {
        type: Date,
        default: null
      }

}) 

const Listing = mongoose.model("Listing",listingSchema);
module.exports = Listing;