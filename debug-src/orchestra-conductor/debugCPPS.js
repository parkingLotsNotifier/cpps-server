const { spawn ,spawnSync} = require('child_process');
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
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
const pyCompAvgsIntens = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/compute_avarage_intensities.py'
const pyCreateSlots = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/create_slots.py'
//load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;
const debugCPPS = async () => {
  try {

    
    const srcPicturePath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/pictures';
    const destCroppedPicturesPath= '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/cropOutput'
    const pathOccupied ='/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/occupied'
    const pathUnoccupied = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/unoccupied'


    const fileNames = fs.readdirSync(srcPicturePath);
    
    fileNames.forEach(async (pictureName) => {
    
      //generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName.slice(0,-4),lstOfDictLotNameBbox.length)
    console.log(croppedPicNames)
    //crop
    let rois = spawnSync('python',[pyCropPics , srcPicturePath, pictureName.slice(0,-4) ,JSON.stringify(lstOfDictLotNameBbox),JSON.stringify(croppedPicNames)], { encoding : 'utf8' })
   
    //save
    spawnSync('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames) ],{
      input : rois.stdout,
      encoding: 'utf-8'
    })
    
    //compute avarage intensity
    let avgs = spawnSync('python',[pyCompAvgsIntens],{
      input : rois.stdout,
      encoding: 'utf-8'
    }
    );
    
    //create slots 
    let croppedMessage = await executeChildProcess('python', [pyCreateSlots, pictureName.slice(0,-4) , JSON.stringify(lstOfDictLotNameBbox),JSON.stringify(croppedPicNames) ,avgs.stdout], {
           stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
         });//TODO: implement in js
   
    const isCropped = croppedMessage.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(croppedMessage.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    

    //prediction - child process
    const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py',  `${destCroppedPicturesPath}`,JSON.stringify(croppedMessage)], {
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
        spawn('mv', [`${destCroppedPicturesPath}/${slot.filename}`,`${pathOccupied}`]);
       }
       else{
        spawn('mv', [`${destCroppedPicturesPath}/${slot.filename}`,`${pathUnoccupied}`]);
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
