const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const {cpPredictOldToNewBeforeStore} = require('../data-preparation/cpPredictOldToNewBeforeStore')
const { emitPipelineFinished, emitPipelineError } = require('../events/index');
const {compareAverageIntensity} = require('../process/compareAverageIntensity')
const {deleteToPredictAndAverageIntensity} = require('../data-preparation/deleteToPredictAndAverageIntensity')
const {generateCroppedPicNames} = require('../data-preparation/croppedFileNames')
const path = require('path');
const Blueprint = require('../data-preparation/Blueprint')
const fs = require('fs')
const {getRois,getAvgs,setRois,setAvgs,createSocketServer} = require('../socket-server/unixDomainSocketServer');
const Document = require('../data-preparation/Document');
const Coordinate = require('../data-preparation/Coordinate');
const Slot = require('../data-preparation/Slot');

const logger = createLogger('startCPPS');
let croppedPicNames;
let prevMsg;
const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const srcPicturePath = '/data/data/com.termux/files/home/photos';
const destCroppedPicturesPath= '/data/data/com.termux/files/home/photos/cropped';
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
const pyCompAvgsIntens = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/compute_avarage_intensities.py'
const pytorchModelScriptPath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py'

function reviver(key, value) {
  // Assuming that if it's a string and starts with '{', it might be a JSON string.
  if (typeof value === "string" && value.startsWith('{')) {
      try {
          return JSON.parse(value,reviver);
      } catch (e) {
          return value; // If parsing failed, return the original value
      }
  }
  return value; // Return the value unchanged if it's not a string or doesn't look like JSON
}
const executeChildProcess = (cmd, args, options) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options);
    let messageData;

    child.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString(),reviver);
      resolve(message);
  });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} failed with code ${code}`));
      }
      else{
        resolve(code.toString())
      }
    
    });

    child.stderr.on('data', (data) => {
      logger.error(`Error from child process: ${data.toString()}`);
    });
  });
};

//create an adress to unix domain ipc
const socketPath = path.join(__dirname, 'startCPPS.sock');

// Remove the socket file if it already exists
if (fs.existsSync(socketPath)) {
  fs.unlinkSync(socketPath);
}

// Initialize and start the socket server
createSocketServer(socketPath);

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

    //generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName,lstOfDictLotNameBbox.length)
    

    //crop
    await executeChildProcess('python',[pyCropPics , srcPicturePath, pictureName ,JSON.stringify(lstOfDictLotNameBbox),socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    //save
    await executeChildProcess('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames),socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    //compute avarage intensity
    await executeChildProcess('python',[pyCompAvgsIntens,socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    //this replace the create slots
    let doc = new Document(pictureName);
    let rois = JSON.parse(getRois());
    let avgs = JSON.parse(getAvgs());
    for( let i=0;i<croppedPicNames.length;i++){
      let coordinate = new Coordinate(...lstOfDictLotNameBbox[i].bbox);
      doc.addSlot(new Slot(lstOfDictLotNameBbox[i].lotName,coordinate,croppedPicNames[i],rois[i],avgs[i]));
    }

    let currMsg = JSON.parse(doc.toString(),reviver);
    
    const isCropped = currMsg.fileName != undefined ? true:false
    if(!isCropped){
      throw new Error(currMsg.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
  
    const threshold = 10;
    currMsg = prevMsg === undefined ? currMsg:compareAverageIntensity(prevMsg,currMsg,threshold);
    
    //prediction - child process
   
    let predictions = await executeChildProcess('python', [pytorchModelScriptPath, destCroppedPicturesPath,JSON.stringify(currMsg)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    }); 
    
    //TODO: the initialization of slots needs to be consolidated within the Document class.
    predictions.forEach((prediction)=>{
      currMsg.slots[prediction.index].prediction=prediction.prediction;
    })

    const isPredict = currMsg.fileName != undefined ? true:false;
    if(!isPredict){
      throw new Error(currMsg.error)
    }
    logger.verbose(`photo name ${pictureName} has been predicted`);
    

    //prepair data for store
    
    //TODO: the parkingName is given inside cpPredictOldToNewBeforeStore , it is not belong here. instead it should be within Document class.
    //TODO: The methods cpPredictOldToNewBeforeStore and deleteToPredictAndAverageIntensity should be consolidated within the Document class.
    currMsg =  cpPredictOldToNewBeforeStore(currMsg, prevMsg);
    
    prevMsg = structuredClone(currMsg);
    
    currMsg =  deleteToPredictAndAverageIntensity(currMsg);   
    
    
  //store
    const isStored =  storeParkingLotsData(currMsg);
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
