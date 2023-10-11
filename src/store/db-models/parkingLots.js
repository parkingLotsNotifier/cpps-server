const mongoose = require(`mongoose`);

const ParkingLotSchema = new mongoose.Schema({parkingName: {type : String ,default : 'unavalable'},
lots :[{
    name: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: 'unavailable'
    }
  }]}, {timestamps : true});
  
  const ParkingLots = mongoose.model('ParkingLots', ParkingLotSchema);
  
  module.exports = ParkingLots;



