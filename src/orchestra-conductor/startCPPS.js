const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {parsePredictions} = require('../parser/parser')
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');


const logger = createLogger('startCPPS');

const executeChildProcess = (cmd, args, options) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options);
    let messageData;

    child.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString());
      resolve(message);
  });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} failed with code ${code}`));
      } else if (!messageData) {
        reject(new Error(`No message received from child ${cmd} ${args} process`));
      }
    });

    child.stderr.on('data', (data) => {
      logger.error(`Error from child process: ${data.toString()}`);
    });
  });
};


const startCPPS = async () => {
  try {
    
    //cature
    const pictureName = await capturePhoto();
    const isCaptured = pictureName != undefined ? true:false
    if(isCaptured){
      logger.info(`photo name ${pictureName} has been captured `)
    }
    
    /**
    * process services 
    */
    
    //rotate
    const isRotated = await rotateImage(`/data/data/com.termux/files/home/photos/${pictureName}.jpg`);
    if(isRotated){
      logger.info(`photo name ${pictureName} has been rotated `)
    }
   
    //croped - child process
    const croppedMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop.py', `/data/data/com.termux/files/home/photos/${pictureName}`], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isCropped = croppedMessage.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(croppedMessage.error)
    }
    logger.info(`photo name ${pictureName} has been cropped `)
    
    //prediction - child process
    const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py'], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isPredict = croppedMessage.file_name != undefined ? true:false;
    if(!isPredict){
      throw new Error(pytorchMessage.error)
    }
    logger.info(`photo name ${pictureName} has been predicted`);
    const parsedPredictions = await parsePredictions(pytorchMessage);
      
    //store
    const isStored = await storeParkingLotsData(parsedPredictions);
    if(isStored){
      logger.info(`predictions has been saved to db`)
    }
      
     
    //remove photos
     spawn('rm', ['/data/data/com.termux/files/home/photos/*.jpg', '/data/data/com.termux/files/home/photos/cropped/*.jpg'],{ shell: true });

  } catch (error) {
    logger.error(`Error in startCPPS: ${error.message}`);
  }
};

module.exports = {
  startCPPS,
};
