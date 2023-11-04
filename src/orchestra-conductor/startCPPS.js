const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const {dataPreparation} = require('../data-preparation/dataPreparation')
const { emitPipelineFinished, emitPipelineError } = require('../events/index');
const {compareHashes} = require('../process/compare-hashes')

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

let oldCropMessage;

const startCPPS = async () => {
  try {
   
    //cature
    const pictureName = await capturePhoto();
    const isCaptured = pictureName != undefined ? true:false
    if(isCaptured){
      logger.verbose(`photo name ${pictureName} has been captured `)
    }
    
    /**
    * process services 
    */
    
    //rotate
    const isRotated = await rotateImage(`/data/data/com.termux/files/home/photos/${pictureName}.jpg`);
    if(isRotated){
      logger.verbose(`photo name ${pictureName} has been rotated `)
    }

    
    const srcPictureName = '/data/data/com.termux/files/home/photos';
    const destCropped= '/data/data/com.termux/files/home/photos/cropped';

   
    //croped - child process
    let newCroppedMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop.py', `${srcPictureName}`,`${pictureName}` , `${destCropped}`], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isCropped = newCroppedMessage.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(newCroppedMessage.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    
      const threshold = 10;
      newCroppedMessage = oldCropMessage === undefined ? newCroppedMessage:compareHashes(oldCropMessage,newCroppedMessage,threshold);
      
      //prediction - child process
      const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py', `${destCropped}`,JSON.stringify(newCroppedMessage)], {
        stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
      });    
      const isPredict = pytorchMessage.file_name != undefined ? true:false;
      if(!isPredict){
        throw new Error(pytorchMessage.error)
      }
      logger.verbose(`photo name ${pictureName} has been predicted`);

      //prepair data for store
      const prepairedData = await dataPreparation(pytorchMessage,oldCropMessage);
        

    
   //store
    const isStored = await storeParkingLotsData(prepairedData);
    if(isStored){
      logger.verbose(`predictions has been saved to DB`)
    }
    
    const sleep = (secs) => {
      return new Promise((resolve) => {
        setTimeout(resolve, secs * 1000); 
      });
    }

    //rest
    const isResting = await sleep(5);
    if(isResting){
      logger.verbose('zZzZ.. Server is well rested')
    }
      
      
    const homeDir = require('os').homedir();
    //remove photos
    //spawn('rm -f', [`${homeDir}/photos/*.jpg`, `${homeDir}/photos/cropped/*.jpg`], {shell: true});
    //logger.info(`deleting photos from server`)
    oldCropMessage =newCroppedMessage;
    logger.info('CPPS has completed the run')
    emitPipelineFinished();
  } catch (error) {
    logger.error(`Error in startCPPS: ${error.message}`);
    emitPipelineError(error);
  }
};

module.exports = {
  startCPPS,
};
