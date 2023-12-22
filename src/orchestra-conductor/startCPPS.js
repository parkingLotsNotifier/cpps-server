const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const { emitPipelineFinished, emitPipelineError } = require('../events/index');
const {compareAverageIntensity} = require('../process/compareAverageIntensity')
const {generateCroppedPicNames} = require('../data-preparation/croppedFileNames')
const path = require('path');
const Blueprint = require('../data-preparation/Blueprint')
const fs = require('fs')
const {getRois,getAvgs,setRois,setAvgs,createSocketServer} = require('../socket-server/unixDomainSocketServer');
const Document = require('../data-preparation/Document');

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
    const isRotated = await rotateImage(`${srcPicturePath}/${pictureName}.jpg`);
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
    //TODO: is it possible to save using fs module ?
    await executeChildProcess('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames),socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    //compute avarage intensity
    await executeChildProcess('python',[pyCompAvgsIntens,socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    
    let doc = new Document(pictureName,croppedPicNames,JSON.parse(getRois()),JSON.parse(getAvgs()),lstOfDictLotNameBbox,"Student residences");
   

    
    const isCropped = doc.filename != undefined ? true:false
    if(!isCropped){
      throw new Error(doc.error);
    }
    logger.verbose(`photo name ${pictureName} has been cropped`);
  
    const threshold = 10;
    
    //TODO: compareAverageIntensity needs to be consilidate within Document class
    doc = prevMsg === undefined ? doc:compareAverageIntensity(prevMsg,doc,threshold);
    
    //prediction - child process
    
    let predictions = await executeChildProcess('python', [pytorchModelScriptPath, destCroppedPicturesPath,JSON.stringify(JSON.parse(doc.toString(),reviver))], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    }); 
    
    //TODO: the initialization of slots needs to be consolidated within the Document class.
    predictions.forEach((prediction)=>{
      doc.slots[prediction.index].prediction=prediction.prediction;
    })

    const isPredict = doc.filename != undefined ? true:false;
    if(!isPredict){
      throw new Error(doc.error)
    }
    logger.verbose(`photo name ${pictureName} has been predicted`);
    

    //prepair data for store
    
    doc.cpPredictOldToNewBeforeStore(prevMsg);
    
    prevMsg = JSON.parse(doc.toString(),reviver);
     
    
    
  //store
    const isStored =  storeParkingLotsData(JSON.parse(doc.toString(),reviver));
    if(isStored){
      logger.verbose(`predictions has been saved to DB`)
    }
    
    const sleep = (secs) => {
      return new Promise((resolve) => {
        setTimeout(resolve(true), secs * 1000); 
      });
    }

    //rest
    const isResting = await sleep(1);
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
