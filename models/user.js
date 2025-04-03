const { required } = require('joi');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
    name:{
        type : String,
        required : true,
    },
    username: {  
        type: String,
        required: true,
        unique: true
    },
    email : {
        type : String,
        required : true,
    },
    dob:{
        type : Date,
        required : true,
    },
    licenseno:{
        type:String,
        required:true,
    },
    mobile: {
         type: String,
          required: true
     },
     role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
     }
})
userSchema.plugin(passportLocalMongoose);


module.exports = mongoose.model("User", userSchema);