const { spawn, exec } = require('child_process');
const { rotateImage } = require('../../src/process/rotate');
const { capturePhoto } = require('../../src/capture/captureWapper');
const { createLogger } = require('../../src/logger/logger');
const { emitPipelineFinished, emitPipelineError } = require('../../src/events/index');
const { generateCroppedPicNames } = require('../../src/data-preparation/croppedFileNames');
const path = require('path');
const Blueprint = require('../../src/data-preparation/Blueprint');
const fs = require('fs');
const { createSocketServer, getRois } = require('../../src/socket-server/unixDomainSocketServer');
const Document = require('../../src/data-preparation/Document');
const { connect } = require('../socketio-client/socketioClient');
const init = require('../../src/utils/Init');

// Initializations 
let pipelineShouldContinue = true;
const logger = createLogger('startDCC');
let croppedPicNames;
const jsonFilePath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json';
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py';
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py';
let pictureName = '';

// Functions declarations
function reviver(key, value) {
  if (typeof value === "string" && value.startsWith('{')) {
    try {
      return JSON.parse(value, reviver);
    } catch (e) {
      return value;
    }
  }
  return value;
}

const socket = connect();

const getPredictionsBase64 = async (base64Images) => {
  return new Promise((resolve, reject) => {
    try {
      socket.on('predictions', (predictions) => {
        resolve(predictions);
      });
      socket.emit('image_list', base64Images);
    } catch (error) {
      console.error(`Error in getPredictions: ${error.message}`);
      reject(error);
    }
  });
};

const executeChildProcess = (cmd, args, options, timeout) => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, options);

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Process timed out in ${args[0]}`));
    }, timeout);

    child.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString(), reviver);
      clearTimeout(timer);
      resolve(message);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`${cmd} ${args[0]} failed with code ${code}`));
      } else {
        resolve(code.toString());
      }
    });

    child.stderr.on('data', (data) => {
      logger.error(`Error from child process ${cmd} ${args[0]} : ${data.toString()}`);
    });
  });
};

const runWithTimeout = (promise, timeout, operationName) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out: ${operationName}`)), timeout))
  ]);
};

// Create an address to Unix domain IPC
const socketPath = path.join(__dirname, 'startDCC');

// Remove the socket file if it already exists
if (fs.existsSync(socketPath)) {
  fs.unlinkSync(socketPath);
}

// Initialize and start the socket server
createSocketServer(socketPath);

// Load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;

const timeOut = 60000; // Timeout of 60 seconds

const startDCC = async () => {
  try {
    // Capture
    pictureName = await runWithTimeout(capturePhoto(), timeOut, 'capturePhoto');
    
    await runWithTimeout(new Promise((resolve, reject) => {
      exec(`mv ${init.rootPhotosDir}/${pictureName}.jpg ${init.srcPicturePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Execution error: ${error}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`Error output: ${stderr}`);
        }
        console.log(`Output: ${stdout}`);
        logger.verbose(`photo name ${pictureName} has been moved to ${init.srcPicturePath}`);
        resolve();
      });
    }), timeOut, 'movePhoto');

    logger.verbose(`photo name ${pictureName} has been captured`);

    // Generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName, lstOfDictLotNameBbox.length);

    // Crop
    await runWithTimeout(executeChildProcess('python', [pyCropPics, init.srcPicturePath, pictureName, JSON.stringify(lstOfDictLotNameBbox), socketPath], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] }, timeOut), timeOut, 'cropPhoto');
    logger.verbose(`photo name ${pictureName} has been cropped`);

    // Classification as an outside service using https://github.com/parkingLotsNotifier/classification-server
    let classifications = await runWithTimeout(getPredictionsBase64(JSON.parse(getRois())), timeOut, 'getPredictions');
    logger.verbose(`photo name ${pictureName} has been predicted`);

    // Save
    await runWithTimeout(executeChildProcess('python', [pySavePics, init.destCroppedPicturesPath, JSON.stringify(croppedPicNames), socketPath], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] }, timeOut), timeOut, 'savePhoto');
    logger.verbose(`photo name ${pictureName} has been saved`);

    // Placeholders for average intensities and ROIs, hence slot's constructor  
    let placeholderAvgs = new Array(lstOfDictLotNameBbox.length).fill(0);
    let placeholderRois = new Array(lstOfDictLotNameBbox.length).fill(0);

    let doc = new Document(pictureName, croppedPicNames, placeholderRois, placeholderAvgs, lstOfDictLotNameBbox, "Student residences");

    // Store in folders after classification
    doc.slots.forEach((slot, index) => {
      if (classifications[index] == "occupied") {
        spawn('mv', [`${init.destCroppedPicturesPath}/${slot.croppedFilename}`, `${init.occupiedPath}`]);
      } else {
        spawn('mv', [`${init.destCroppedPicturesPath}/${slot.croppedFilename}`, `${init.unoccupiedPath}`]);
      }
    });

    logger.verbose(`cropped photos moved to their folders`);

    await new Promise(resolve => setTimeout(resolve, timeOut));

    emitPipelineFinished();

  } catch (error) {
    logger.error(`Error in startDCC: ${error.message}`);
    emitPipelineError(`${pictureName}`);
  }
};

module.exports = {
  startDCC,
};
