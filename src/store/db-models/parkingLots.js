const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
const Schema = mongoose.Schema;

// Define the Coordinate schema
const CoordinateSchema = new Schema({
    x1: Number,
    y1: Number,
    w: Number,
    h: Number,
    center: {
        x: Number,
        y: Number
    }
});

// Define the Prediction schema
const PredictionSchema = new Schema({
    class: String,
    confidence: Number
});

// Define the Slot schema
const SlotSchema = new Schema({
    fileName: String,
    coordinate: CoordinateSchema,
    prediction: PredictionSchema,
    lotName: String 
});

// Define the main schema
const ParkingLotsSchema = new Schema({
    fileName: String,
    slots: [SlotSchema],
    parkingName: String 
},{timestamps : true});

// Create the model
const ParkingLots = mongoose.model('ParkingLots', ParkingLotsSchema);

module.exports = ParkingLots;
