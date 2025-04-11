const Joi = require('joi');
const { model } = require('mongoose');

 module.exports.listingSchema = Joi.object({
    listing : Joi.object({
        brand:Joi.string().required(),
        model:Joi.string().required(),
        description : Joi.string().required(),
        rental_price : Joi.number().required().min(0),
    }).required(),
 });