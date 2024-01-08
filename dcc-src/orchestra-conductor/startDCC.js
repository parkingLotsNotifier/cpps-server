const { spawn, exec } = require('child_process');
const { rotateImage } = require('../../src/process/rotate');
const { capturePhoto } = require('../../src/capture/captureWapper');
const {createLogger} = require('../../src/logger/logger');
const { emitPipelineFinished, emitPipelineError, oncPipelineClose } = require('../../src/events/index');
const {generateCroppedPicNames} = require('../../src/data-preparation/croppedFileNames')
const path = require('path');
const Blueprint = require('../../src/data-preparation/Blueprint')
const fs = require('fs');
const fse = require('fs-extra');
const {createSocketServer,getRois} = require('../../src/socket-server/unixDomainSocketServer');
const Document = require('../../src/data-preparation/Document');
const io = require('socket.io-client');

// A global flag
let pipelineShouldContinue = true;
const logger = createLogger('startDCC');
let croppedPicNames;
const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'



const date = new Date();
date_DMY = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`
const rootDateDir = `/data/data/com.termux/files/home/photos/data-collection/${date_DMY}`;
const srcPicturePath = `${rootDateDir}/original`;
const destCroppedPicturesPath= `${rootDateDir}/cropped`;
const occupiedPath = `${destCroppedPicturesPath}/occupied`;
const unoccupiedPath = `${destCroppedPicturesPath}/unccupied`;

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

const getPredictionsBase64 = async (base64Images) => {
  return new Promise((resolve, reject) => {
    try {
      // Establish a connection to the WebSocket server
      const socket = io('http://192.168.0.96:8001');

      // Handle the event with the predictions response
      socket.on('predictions', (predictions) => {
        resolve(predictions);
        socket.disconnect();
      });

      // Send the base64 images list
      socket.emit('image_list', base64Images);

    } catch (error) {
      console.error(`Error in getPredictions: ${error.message}`);
      reject(error);
    }
  });
};




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
const socketPath = path.join(__dirname, 'startDCC');

// Remove the socket file if it already exists
if (fs.existsSync(socketPath)) {
  fs.unlinkSync(socketPath);
}

// Initialize and start the socket server
createSocketServer(socketPath);

//load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;

//creating a labeled dataset
fse.ensureDirSync(rootDateDir);
fse.ensureDirSync(srcPicturePath);
fse.ensureDirSync(destCroppedPicturesPath);
fse.ensureDirSync(occupiedPath);
fse.ensureDirSync(unoccupiedPath);

// Event listener for pipeline close
oncPipelineClose(() => {
  pipelineShouldContinue = false;
  logger.info("Pipeline is closing");
});

const startDCC = async () => {
  try {
    
    
    //capture
    const pictureName = await capturePhoto();
    exec(`mv /data/data/com.termux/files/home/photos/${pictureName}.jpg ${srcPicturePath}`)
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
    logger.verbose(`photo name ${pictureName} has been cropped`);


    // prediction as an outside service using https://github.com/parkingLotsNotifier/predict-server
    let predictions = await getPredictionsBase64(JSON.parse(getRois()));

    logger.verbose(`photo name ${pictureName} has been predict`);
    
    
    //save
    await executeChildProcess('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames),socketPath],{
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    
    logger.verbose(`photo name ${pictureName} has been saved`);

    
    let placeholderAvgs = new Array(lstOfDictLotNameBbox.length).fill(0); 
    let placeholderRois = new Array(lstOfDictLotNameBbox.length).fill(0); 
    
    let doc = new Document(pictureName,croppedPicNames,placeholderRois,placeholderAvgs,lstOfDictLotNameBbox,"Student residences");
   


    //store in folders
    doc.slots.forEach((slot,index)=>{
        if(predictions[index] == "occupied"){
         spawn('mv', [`${destCroppedPicturesPath}/${slot.croppedFilename}`,`${occupiedPath}`]);
        }
        else{
         spawn('mv', [`${destCroppedPicturesPath}/${slot.croppedFilename}`,`${unoccupiedPath}`]);
        }})
    
    logger.verbose(`cropped photos moved to their folders`);
    
    // Regularly check the state
    if (!pipelineShouldContinue) {
      logger.verbose("Stopping startDCC as pipeline is set to close");
      return; // Exit the function
    }    
    
    
    emitPipelineFinished();
    // Regularly check the state
    
  } catch (error) {
    logger.error(`Error in startDCC: ${error.message}`);
    emitPipelineError(error);
  }
};

module.exports = {
  startDCC,
};
