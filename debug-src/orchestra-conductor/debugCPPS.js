const { spawn } = require('child_process');
const {createLogger} = require('../../src/logger/logger');
//const {dataPreparation} = require('../../src/data-preparation/dataPreparation')
const {generateCroppedPicNames} = require('../../src/data-preparation/croppedFileNames')
const Blueprint = require('../../src/data-preparation/Blueprint')
const fs = require('fs');
const util = require('util');


const logger = createLogger('debugCPPS');

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

let oldMessage;
const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'

//load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;
const debugCPPS = async () => {
  try {

    
    const srcPictureName = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/pictures';
    const destCropped= '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/cropOutput'
    const pathOccupied ='/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/occupied'
    const pathUnoccupied = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/unoccupied'


    const fileNames = fs.readdirSync(srcPictureName);
    
    fileNames.forEach(async (pictureName) => {
    
      //generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName,lstOfDictLotNameBbox.length)
   
    //croped - child process
    const croppedMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_save_avg_append.py',`${srcPictureName}`, `${pictureName.slice(0,-4)}`,`${destCropped}`,JSON.stringify(lstOfDictLotNameBbox),JSON.stringify(croppedPicNames)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isCropped = croppedMessage.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(croppedMessage.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    

    //prediction - child process
    const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py',  `${destCropped}`,JSON.stringify(croppedMessage)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });  
    
    const isPredict = pytorchMessage.slots[0].prediction != undefined ? true:false;
    if(!isPredict){
      throw new Error(pytorchMessage.error);
    }
    logger.verbose(`photo name ${pictureName} has been predicted`);

    
    //move predictions
    pytorchMessage.slots.forEach((slot)=>{
       if(slot.prediction.class == "occupied"){
        spawn('mv', [`${destCropped}/${slot.filename}`,`${pathOccupied}`]);
       }
       else{
        spawn('mv', [`${destCropped}/${slot.filename}`,`${pathUnoccupied}`]);
       }

    });
        
   
   //prepair data 
   console.log( util.inspect( pytorchMessage,{ depth: null }));
   
   
  });
   
  } catch (error) {
    logger.error(`Error in debugCPPS: ${error.message}`);
  }
};

module.exports = {
  debugCPPS,
};
