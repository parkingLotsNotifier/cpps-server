const { spawn } = require('child_process');
const {createLogger} = require('../../src/logger/logger');
const {generateCroppedPicNames} = require('../../src/data-preparation/croppedFileNames')
const Blueprint = require('../../src/data-preparation/Blueprint')
const fs = require('fs');
const util = require('util');
const path = require('path');
const {getRois,getAvgs,setRois,setAvgs,createSocketServer} = require('../../src/socket-server/unixDomainSocketServer');
const Document = require('../../src/data-preparation/Document');
const Coordinate = require('../../src/data-preparation/Coordinate');
const Slot = require('../../src/data-preparation/Slot');
const logger = createLogger('debugCPPS');

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
const socketPath = path.join(__dirname, 'debugCPPS');

// Remove the socket file if it already exists
if (fs.existsSync(socketPath)) {
  fs.unlinkSync(socketPath);
}

// Initialize and start the socket server
createSocketServer(socketPath);




const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
const pyCompAvgsIntens = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/compute_avarage_intensities.py'
const pytorchModelScriptPath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py'


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
    console.log(socketPath)
    fileNames.forEach(async (pictureName) => {
    
      //generate cropped file names
    croppedPicNames = generateCroppedPicNames(pictureName.slice(0,-4),lstOfDictLotNameBbox.length)
    console.log(croppedPicNames)
    
      //crop
      await executeChildProcess('python',[pyCropPics , srcPicturePath, pictureName.slice(0,-4) ,JSON.stringify(lstOfDictLotNameBbox),socketPath],{
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
        
      let doc = new Document(pictureName);
      let rois = JSON.parse(getRois());
      let avgs = JSON.parse(getAvgs());
      for( let i=0;i<croppedPicNames.length;i++){
        let coordinate = new Coordinate(...lstOfDictLotNameBbox[i].bbox);
        doc.addSlot(new Slot(lstOfDictLotNameBbox[i].lotName,coordinate,croppedPicNames[i],rois[i],avgs[i]));
      }
      
      let msg = JSON.parse(doc.toString(),reviver);
   
    const isCropped = msg.fileName != undefined ? true:false
    if(!isCropped){
      throw new Error(msg.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    

    //prediction - child process
    const pytorchMessage =  await executeChildProcess('python', [pytorchModelScriptPath, destCroppedPicturesPath,JSON.stringify(msg)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });    
    pytorchMessage.forEach((prediction)=>{
      msg.slots[prediction.index].prediction=prediction.prediction;
    })
    const isPredict = msg.slots[0].prediction != undefined ? true:false;
    if(!isPredict){
      throw new Error(pytorchMessage.error);
    }
    logger.verbose(`photo name ${pictureName} has been predicted`);

    
    //move predictions
    msg.slots.forEach((slot)=>{
       if(slot.prediction.class == "occupied"){
        spawn('mv', [`${destCroppedPicturesPath}/${slot.fileName}`,`${pathOccupied}`]);
       }
       else{
        spawn('mv', [`${destCroppedPicturesPath}/${slot.fileName}`,`${pathUnoccupied}`]);
       }

    });
        
   
   
   console.log( util.inspect( msg,{ depth: null }));
   
   
  });
   
  } catch (error) {
    logger.error(`Error in debugCPPS: ${error.message}`);
  }
};

module.exports = {
  debugCPPS,
};
