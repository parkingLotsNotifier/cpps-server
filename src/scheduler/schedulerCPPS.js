const cron = require('node-cron');
const { startCPPS } = require('../orchestra-conductor/startCPPS'); // Replace with the actual path to your startCPPS file
const  checkBatteryStatus  = require('../../phone-health/battery')

const {createLogger} = require('../logger/logger');


const logger = createLogger('schedulerCPPS');

  
  const scheduleCPPS = () => {
   
      cron.schedule('*/1 * * * *', async () => {
        try {
            logger.info('Running startCPPS service');
            startCPPS();
        } catch (error) {
            logger.error(`Error in scheduled task: ${error.message}`);
        }
    });
    cron.schedule('*/10 * * * *', async () => {
      try {
          logger.info('Running startCPPS service');
          await checkBatteryStatus();
      } catch (error) {
          logger.error(`Error in scheduled task: ${error.message}`);
      }
  });
    
  };
  
  
  module.exports = {
    scheduleCPPS,
  };