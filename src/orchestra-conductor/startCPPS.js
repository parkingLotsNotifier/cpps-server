const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const {dataPreperation} = require('../data-preperation/dataPreperation')

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
    const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py', JSON.stringify(croppedMessage)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });    
    const isPredict = pytorchMessage.slots[0].prediction != undefined ? true:false;
    if(!isPredict){
      throw new Error(pytorchMessage.error)
    }
    logger.info(`photo name ${pictureName} has been predicted`);
    
   //prepair data for store
   const prepairedData = await dataPreperation(pytorchMessage);
      

    
   //store
    const isStored = await storeParkingLotsData(prepairedData);
    if(isStored){
      logger.info(`predictions has been saved to DB`)
    }
      
    const homeDir = require('os').homedir();
    //remove photos
    //spawn('rm -f', [`${homeDir}/photos/*.jpg`, `${homeDir}/photos/cropped/*.jpg`], {shell: true});
    //logger.info(`deleting photos from server`)
  } catch (error) {
    logger.error(`Error in startCPPS: ${error.message}`);
  }
};

module.exports = {
  startCPPS,
};
