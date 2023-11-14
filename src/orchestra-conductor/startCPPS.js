const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const {cpPredictOldToNewBeforeStore} = require('../data-preparation/cpPredictOldToNewBeforeStore')
const { emitPipelineFinished, emitPipelineError } = require('../events/index');
const {compareHashes} = require('../process/compare-hashes')
const {deleteToPredictAndHashValue} = require('../data-preparation/deleteToPredictAndHashValue')
const Blueprint = require('../data-preparation/Bluprint')
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


let prevMsg; 
const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const srcPicturePath = '/data/data/com.termux/files/home/photos';
const destCroppedPicturesPath= '/data/data/com.termux/files/home/photos/cropped';
const pyImageCropNameSaveScriptPath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/filenames_crop_save_avg_append.py'
const pytorchModelScriptPath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py'

//load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;

const startCPPS = async () => {
  try {
    
    //capture
    const pictureName = await capturePhoto(); 
    const isCaptured = pictureName != undefined ? true:false
    if(isCaptured){
      logger.verbose(`photo name ${pictureName} has been captured `)
    }
    
    /**
    * process services 
    */
    
    //rotate
    const isRotated = await rotateImage(`${srcPicturePath}/${pictureName}.jpg`);//TODO: why on capturePhoto we used spawn and here exec ? , is rotateImage can be a python script ?
    if(isRotated){
      logger.verbose(`photo name ${pictureName} has been rotated `)
    }


    //croped - child process
    let currMsg = await executeChildProcess('python', [`${pyImageCropNameSaveScriptPath}`, `${srcPicturePath}`,`${pictureName}` , `${destCroppedPicturesPath}`,JSON.stringify(lstOfDictLotNameBbox)], {//TODO: comments inside image_crop_name_save.py
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isCropped = currMsg.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(currMsg.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    
      const threshold = 10;
      currMsg = prevMsg === undefined ? currMsg:compareHashes(prevMsg,currMsg,threshold);
      
      //prediction - child process
      currMsg = await executeChildProcess('python', [`${pytorchModelScriptPath}`, `${destCroppedPicturesPath}`,JSON.stringify(currMsg)], {
        stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
      });    
      const isPredict = currMsg.file_name != undefined ? true:false;
      if(!isPredict){
        throw new Error(currMsg.error)
      }
      logger.verbose(`photo name ${pictureName} has been predicted`);
      

      //prepair data for store
      currMsg = await cpPredictOldToNewBeforeStore(currMsg, prevMsg);
      
      prevMsg = structuredClone(currMsg);
      
      currMsg = await deleteToPredictAndHashValue(currMsg);   
     
    
   //store
    const isStored = await storeParkingLotsData(currMsg);
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
    spawn('rm -f', [`${homeDir}/photos/*.jpg`, `${homeDir}/photos/cropped/*.jpg`], {shell: true});
    logger.info(`deleting photos from server`)
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
