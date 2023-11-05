const { exec } = require('child_process');
const {createLogger} = require('../logger/logger');


const logger = createLogger('captureWapper');


const capturePhoto = () => {
  return new Promise((resolve, reject) => {
    // Get device model
    // exec('getprop | grep -F ro.product.model | cut -c21-', (error, stdout) => {
    //   if (error) {
    //     logger.error(`Failed to get device model: ${error.message}`);
    //     reject(error);
    //     return;
    //   }
    

      const device_model = '[Prototype]';
      const file_name = `picture-${device_model}-${new Date().toLocaleString('he-IL',{ hour12: false }).replace(/, /g, '-')}`;
      logger.verbose(`Device Model: ${device_model}, File Name: ${file_name}`);

      // Capture photo
      exec(`termux-camera-photo ~/photos/${file_name}.jpg`, (error) => {
        if (error) {
          logger.error(`Failed to take a photo: ${error.message}`);
          reject(error);
          return;
        }

        logger.verbose('Photo taken successfully.');
        resolve(file_name);
      });
    });
  // });
};

module.exports = {
  capturePhoto
};
