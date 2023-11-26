const { spawn ,spawnSync} = require('child_process');
const {createLogger} = require('../../src/logger/logger');
const {generateCroppedPicNames} = require('../../src/data-preparation/croppedFileNames')
const Blueprint = require('../../src/data-preparation/Blueprint')
const fs = require('fs');
const util = require('util');
const net = require('net');
const path = require('path');

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

const executeChildProcessUnixSocket = (cmd, args, dataToSend, socketPath) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(socketPath, async () => {
      const child =  spawn(cmd, args.concat(socketPath), { stdio: ['ignore', 'ignore', 'pipe'] });
      child.on('error', (err)=>{
        reject(err);
        server.close();
      });
      child.on('close',()=>{
        server.close();
      })
      child.stderr.on('data', (data) => {
        logger.error(`Error from child process: ${data.toString()}`);
      });
    });

    server.on('connection', (socket) => {
      
      // Send data immediately upon connection
      if(dataToSend != null){  
        const sendData = dataToSend.toString();
        socket.write(sendData);
      }

      let dataBuffer = '';
      socket.on('data', (chunk) => {
        dataBuffer += chunk.toString();
      });
       
     

      socket.on('end', () => {
        resolve(dataBuffer);
        server.close();
      });

      

      socket.on('error', (err) => {
        reject(err);
        server.close();
      });
    });

    server.on('error', (err) => {
      reject(err);
      server.close();
    });

    
  });
};




const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
const pyCompAvgsIntens = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/compute_avarage_intensities.py'
const pyCreateSlots = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/create_slots.py'

//load Blueprint and extract the basic data
const blueprint = new Blueprint(jsonFilePath);
const lstOfDictLotNameBbox = blueprint.categoryNameToBbox;

const socketPath = path.join(__dirname, 'deb.sock');

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
    let rois = await executeChildProcessUnixSocket('python',[pyCropPics , srcPicturePath, pictureName.slice(0,-4) ,JSON.stringify(lstOfDictLotNameBbox)],null,socketPath);
    
    //save
    await executeChildProcessUnixSocket('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames)],rois,socketPath);
   
    //compute avarage intensity
    let avgs = await executeChildProcessUnixSocket('python',[pyCompAvgsIntens],rois,socketPath);

    
    //create slots 
    let croppedMessage = await executeChildProcess('python', [pyCreateSlots, pictureName.slice(0,-4) , JSON.stringify(lstOfDictLotNameBbox),JSON.stringify(croppedPicNames) ,avgs], {
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
