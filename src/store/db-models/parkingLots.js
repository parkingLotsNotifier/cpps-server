const mongoose = require('mongoose');
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
    filename: String,
    coordinate: CoordinateSchema,
    prediction: PredictionSchema,
    lot_name: String 
});

// Define the main schema
const ParkingLotsSchema = new Schema({
    file_name: String,
    slots: [SlotSchema],
    parking_name: String 
});

// Create the model
const ParkingLots = mongoose.model('ParkingLots', ParkingLotsSchema);

module.exports = ParkingLots;
