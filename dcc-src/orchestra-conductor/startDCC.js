const { spawn, exec } = require('child_process');
const { rotateImage } = require('../../src/process/rotate');
const { capturePhoto } = require('../../src/capture/captureWapper');
const { createLogger } = require('../../src/logger/logger');
const { emitPipelineFinished, emitPipelineError, oncPipelineClose, oncPipelineContinue } = require('../../src/events/index');
const { generateCroppedPicNames } = require('../../src/data-preparation/croppedFileNames')
const path = require('path');
const Blueprint = require('../../src/data-preparation/Blueprint')
const fs = require('fs');
const fse = require('fs-extra');
const { createSocketServer, getRois } = require('../../src/socket-server/unixDomainSocketServer');
const Document = require('../../src/data-preparation/Document');
const { connect } = require('../socketio-client/socketioClient');


//initializations 
let pipelineShouldContinue = true;
const logger = createLogger('startDCC');
let croppedPicNames;
const jsonFilePath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
let date;
let date_DMY;
let rootDateDir;
let srcPicturePath;
let destCroppedPicturesPath;
let occupiedPath;
let unoccupiedPath;

createPaths();
createFolderStructure();


//functions declerations
function reviver(key, value) {
  // Assuming that if it's a string and starts with '{', it might be a JSON string.
  if (typeof value === "string" && value.startsWith('{')) {
    try {
      return JSON.parse(value, reviver);
    } catch (e) {
      return value; // If parsing failed, return the original value
    }
  }
  return value; // Return the value unchanged if it's not a string or doesn't look like JSON
}


const socket = connect();

const getPredictionsBase64 = async (base64Images) => {
  return new Promise((resolve, reject) => {
    try {

      // Handle the event with the predictions response
      socket.on('predictions', (predictions) => {
        resolve(predictions);
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
      const message = JSON.parse(data.toString(), reviver);
      resolve(message);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} failed with code ${code}`));
      }
      else {
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

function createPaths() {
  date = new Date();
  date_DMY = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
  rootDateDir = `/data/data/com.termux/files/home/photos/data-collection/${date_DMY}`;
  srcPicturePath = `${rootDateDir}/original`;
  destCroppedPicturesPath = `${rootDateDir}/cropped`;
  occupiedPath = `${destCroppedPicturesPath}/occupied`;
  unoccupiedPath = `${destCroppedPicturesPath}/unccupied`;


}

function createFolderStructure() {
  fse.ensureDirSync(rootDateDir);
  fse.ensureDirSync(srcPicturePath);
  fse.ensureDirSync(destCroppedPicturesPath);
  fse.ensureDirSync(occupiedPath);
  fse.ensureDirSync(unoccupiedPath);
}
// Event listener for pipeline close
oncPipelineClose(() => {
  pipelineShouldContinue = false;
  logger.info("Pipeline is closing");
});

oncPipelineContinue(() => {
  pipelineShouldContinue = true;
  logger.info("Pipeline is restarting");

  //update the date and path
  createPaths();
  createFolderStructure();
});

const startDCC = async () => {
  try {


    //capture
    const pictureName = await capturePhoto();
    exec(`mv /data/data/com.termux/files/home/photos/${pictureName}.jpg ${srcPicturePath}`, (error, stdout, stderr) => {
      if (error) {
          console.error(`Execution error: ${error}`);
          return;
      }
      if (stderr) {
          console.error(`Error output: ${stderr}`);
      }
      console.log(`Output: ${stdout}`);
      logger.verbose(`photo name ${pictureName} has been moved to ${srcPicturePath}`);
    });
    const isCaptured = pictureName != undefined ? true : false
    if (isCaptured) {
      logger.verbose(`photo name ${pictureName} has been captured `)
    }

    
    /**
    * process services 
    */

    // //rotate
    // const isRotated = await rotateImage(`${srcPicturePath}/${pictureName}.jpg`);
    // if(isRotated){
    //   logger.verbose(`photo name ${pictureName} has been rotated `)
    // }

    //generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName, lstOfDictLotNameBbox.length)


    //crop
    await executeChildProcess('python', [pyCropPics, srcPicturePath, pictureName, JSON.stringify(lstOfDictLotNameBbox), socketPath], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });
    logger.verbose(`photo name ${pictureName} has been cropped`);


    // classification as an outside service using https://github.com/parkingLotsNotifier/classification-server
    let classifications = await getPredictionsBase64(JSON.parse(getRois()));

    logger.verbose(`photo name ${pictureName} has been predict`);


    //save
    await executeChildProcess('python', [pySavePics, destCroppedPicturesPath, JSON.stringify(croppedPicNames), socketPath], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    logger.verbose(`photo name ${pictureName} has been saved`);

    //place holders for avarage intensitys and rois , hence slot's constructor  
    let placeholderAvgs = new Array(lstOfDictLotNameBbox.length).fill(0);
    let placeholderRois = new Array(lstOfDictLotNameBbox.length).fill(0);

    let doc = new Document(pictureName, croppedPicNames, placeholderRois, placeholderAvgs, lstOfDictLotNameBbox, "Student residences");



    //store in folders after the 
    doc.slots.forEach((slot, index) => {
      if (classifications[index] == "occupied") {
        spawn('mv', [`${destCroppedPicturesPath}/${slot.croppedFilename}`, `${occupiedPath}`]);
      }
      else {
        spawn('mv', [`${destCroppedPicturesPath}/${slot.croppedFilename}`, `${unoccupiedPath}`]);
      }
    })

    logger.verbose(`cropped photos moved to their folders`);

    // Regularly check the state
    if (!pipelineShouldContinue) {
      logger.verbose("Stopping startDCC as pipeline is set to close");
      return; // Exit the  startDCC function
    }

    // const sleep = (secs) => {
    //   return new Promise((resolve) => {
    //     setTimeout(resolve(true), secs * 10000); 
    //   });
    // }

    // //rest
    // const isResting = await sleep(3000000000);
    // if(isResting){
    //   logger.verbose('zZzZ.. Server is well rested')
    // }

    await new Promise(resolve => setTimeout(resolve, 60000));



    emitPipelineFinished();


  } catch (error) {
    logger.error(`Error in startDCC: ${error.message}`);
    emitPipelineError(error);
  }
};

module.exports = {
  startDCC,
};


