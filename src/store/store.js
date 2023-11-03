
const ParkingLots = require('./db-models/parkingLots'); // Replace with the actual path to your schema file

const { createLogger } = require('../logger/logger');

const logger = createLogger('store');

// Store service function
const storeParkingLotsData = async (parkingData) => {
  try {
    // Create a new document
    const parkingLot = new ParkingLots({
      file_name: parkingData.file_name,
      slots: parkingData.slots,
      parking_name: parkingData.parking_name
    });

    // Save the document to the database
    await parkingLot.save();
    
    logger.verbose('Parking data has been stored successfully.');
    
    return true;
  } catch (error) {
    logger.error(`Error storing parking data: ${error.message}`);
    return false;
  }
};

module.exports = {
   storeParkingLotsData
};