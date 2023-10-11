
const ParkingLots = require('./db-models/parkingLots'); // Replace with the actual path to your schema file

const {createLogger} = require('../logger/logger');


const logger = createLogger('store');

// Store service function
const storeParkingLotsData = async (parkingData) => {
  try {
    
    // Create a new document
    const parkingLot =  new ParkingLots({
      parkingName: 'YourParkingName',  // You can change this as needed
      lots: parkingData
    });

   // Save the document to the database
    await parkingLot.save();
    
    logger.info('Parking data has been stored successfully.');
    
    return true;
  } catch (error) {
    logger.error(`Error storing parking data: ${error.message}`);
  }
};

module.exports = {
   storeParkingLotsData
};
