const path = require('path');
const { spawn } = require('child_process');
const {createLogger} = require('../../src/logger/logger');
const {dataPreperation} = require('../../src/data-preperation/dataPreperation')
const fs = require('fs');

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


const debugCPPS = async () => {
  try {
    
    const pathPictures = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/pictures';
    const pathCropOutput= '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/predictionPhotos/cropOutput'
    const pathOccupied ='/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/preditionPhotos/occupied'
    const pathUnoccupied = '/data/data/com.termux/files/home/project-root-directory/cpps-server/debug-src/debugOutput/preditionPhotos/unoccupied'


    const fileNames = fs.readdirSync(pathPictures);
    
    fileNames.forEach(async (pictureName) => {
    
      //croped - child process
    const croppedMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop.py', `${pathPictures}/${pictureName.slice(0,-4)}`], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });
    const isCropped = croppedMessage.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(croppedMessage.error)
    }
    logger.info(`photo name ${pictureName} has been cropped `)
    
    
    //move 
    croppedMessage.slots.forEach((slot)=>
      {
        spawn('mv', [`${slot.filename}`, `${pathCropOutput}`], {shell: true});
        slot.filename = `${pathCropOutput}`+'/' + path.basename(slot.filename);
      });
    
    

    //prediction - child process
    const pytorchMessage = await executeChildProcess('python', ['/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py', JSON.stringify(croppedMessage)], {
      stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
    });  
    
    const isPredict = pytorchMessage.slots[0].prediction != undefined ? true:false;
    if(!isPredict){
      throw new Error(pytorchMessage.error);
    }
    logger.info(`photo name ${pictureName} has been predicted`);

    
    //move predictions
    pytorchMessage.slots.forEach((slot)=>{
       if(slot.prediction.class == "occupied"){
        spawn('mv', [`${slot.filename}`,`${pathOccupied}`]);
       }
       else{
        spawn('mv', [`${slot.filename}`,`${pathUnoccupied}`]);
       }

    });
        

   //prepair data 
   console.log(await dataPreperation(pytorchMessage));
   
   
  });
   
  } catch (error) {
    logger.error(`Error in debugCPPS: ${error.message}`);
  }
};

module.exports = {
  debugCPPS,
};
