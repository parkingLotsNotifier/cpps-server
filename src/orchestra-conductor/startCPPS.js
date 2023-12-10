const { spawn } = require('child_process');
const { rotateImage } = require('../process/rotate');
const { capturePhoto } = require('../capture/captureWapper');
const {storeParkingLotsData} =require('../store/store')
const {createLogger} = require('../logger/logger');
const {cpPredictOldToNewBeforeStore} = require('../data-preparation/cpPredictOldToNewBeforeStore')
const { emitPipelineFinished, emitPipelineError } = require('../events/index');
const {compareHashes} = require('../process/compare-hashes')
const {deleteToPredictAndHashValue} = require('../data-preparation/deleteToPredictAndHashValue')
const {generateCroppedPicNames} = require('../data-preparation/croppedFileNames')
const net = require('net');
const path = require('path');
const Blueprint = require('../data-preparation/Blueprint')
const logger = createLogger('startCPPS');
const fs = require('fs')

let croppedPicNames;
let prevMsg;
let rois;
let avgs; 
const jsonFilePath ='/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
const srcPicturePath = '/data/data/com.termux/files/home/photos';
const destCroppedPicturesPath= '/data/data/com.termux/files/home/photos/cropped';
const pyCropPics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/crop_pics.py'
const pySavePics = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/save_pic.py'
const pyCompAvgsIntens = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/compute_avarage_intensities.py'
const pyCreateSlots = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/create_slots.py'
const pytorchModelScriptPath = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/pytorch_model.py'


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
try{// Create the server
  const server = net.createServer((client) => {
    logger.verbose('Client connected.');
    let message='';
    client.on('data', (data) => {
        logger.verbose(data.length);
        message += data.toString();
        if(message === 'get rois' ){
          const chunkSize = 4096; // 4096 bytes per chunk
          const dataChunks = [];
          for (let i = 0; i < rois.length; i += chunkSize) {
              dataChunks.push(rois.substring(i, i + chunkSize));
          }
          sendDataInChunks(client, dataChunks,rois.length);
          logger.verbose('end');
      
        }
        else if(message === 'get avgs'){
          const chunkSize = 4096; // 4096 bytes per chunk
          const dataChunks = [];
          for (let i = 0; i < avgs.length; i += chunkSize) {
              dataChunks.push(avgs.substring(i, i + chunkSize));
          }
          sendDataInChunks(client, dataChunks,avgs.length);
          client.end();
        }
        
    });

    client.on('end', () => {
        logger.verbose('Client disconnected.');
        message = message.split('\n');
        if(message[0] === 'post rois' ){
          rois = message[1];
          logger.verbose(rois.length);
          
        }
        else if(message[0] === 'post avgs'){
          avgs = message[1];  
          logger.verbose(avgs.length);    
        }

        

    });

   

  });

  function sendDataInChunks(socket, dataChunks ,maxLength) {
    let i = 0;

    function writeChunk() {
        let ok = true;
        while (i < dataChunks.length && ok) {
            if (i === dataChunks.length - 1) {
                socket.write(dataChunks[i]);
            } else {
                ok = socket.write(dataChunks[i]);
            }
            i++;
        }
        if (i < dataChunks.length) {
            socket.once('drain', writeChunk);
            logger.verbose('drain chunk');
        }
        if(i*4096 >= maxLength){
          socket.end()
        }
    }
    writeChunk();
    
}

server.listen(socketPath, () => {
  logger.verbose(`Server listening on ${socketPath}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

}
catch (error) {
  logger.error(`Error in startCPPS: ${error.message}`);
}






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
    
 await executeChildProcess('python',[pySavePics , destCroppedPicturesPath,JSON.stringify(croppedPicNames),socketPath],{
  stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
});
  
  
  await executeChildProcess('python',[pyCompAvgsIntens,socketPath],{
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  });
    
    

    //create slots 
    let currMsg = await executeChildProcess('python', [pyCreateSlots, pictureName , JSON.stringify(lstOfDictLotNameBbox),JSON.stringify(croppedPicNames) ,JSON.stringify(avgs)], {
          stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
        });//TODO: implement in js
  

    const isCropped = currMsg.file_name != undefined ? true:false
    if(!isCropped){
      throw new Error(currMsg.error)
    }
    logger.verbose(`photo name ${pictureName} has been cropped `)
    
      const threshold = 10;
      currMsg = prevMsg === undefined ? currMsg:compareHashes(prevMsg,currMsg,threshold);
      
      //prediction - child process
      currMsg = await executeChildProcess('python', [pytorchModelScriptPath, destCroppedPicturesPath,JSON.stringify(currMsg)], {
        stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
      });    
      const isPredict = currMsg.file_name != undefined ? true:false;
      if(!isPredict){
        throw new Error(currMsg.error)
      }
      logger.verbose(`photo name ${pictureName} has been predicted`);
      

      //prepair data for store
      currMsg =  cpPredictOldToNewBeforeStore(currMsg, prevMsg);
      
      prevMsg = structuredClone(currMsg);
      
      currMsg =  deleteToPredictAndHashValue(currMsg);   
    
    
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
