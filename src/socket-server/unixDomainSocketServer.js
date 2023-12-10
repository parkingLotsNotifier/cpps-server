const net = require('net');
const {createLogger} = require('../logger/logger'); // Adjust path as necessary
const  logger = createLogger('unixDomainSocketServer');

let _rois; // Using underscore as a convention to indicate a private variable
let _avgs;

const getRois = () => _rois;
const getAvgs = () => _avgs;

const setRois = (newRois) => { _rois = newRois; };
const setAvgs = (newAvgs) => { _avgs = newAvgs; };

const createSocketServer = (socketPath) => {
    const server = net.createServer((client) => {
        logger.verbose('Client connected.');
        let message='';
        client.on('data', (data) => {
            logger.verbose(data.length);
            message += data.toString();
            if(message === 'get rois' ){
              const chunkSize = 4096; // 4096 bytes per chunk
              const dataChunks = [];
              const rois = getRois();
              for (let i = 0; i < rois.length; i += chunkSize) {
                  dataChunks.push(rois.substring(i, i + chunkSize));
              }
              sendDataInChunks(client, dataChunks,rois.length);
              logger.verbose('end');
          
            }
            else if(message === 'get avgs'){
              const chunkSize = 4096; // 4096 bytes per chunk
              const dataChunks = [];
              const avgs = getAvgs()
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
              setRois(message[1]);
            }
            else if(message[0] === 'post avgs'){
              setAvgs(message[1]);    
            }
    
            
    
        });
    
       
    
      });
    
      server.listen(socketPath, () => {
        logger.verbose(`Server listening on ${socketPath}`);
      });
    
      server.on('error', (err) => {
        console.error('Server error:', err);
      });
    
      return server;
}

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

module.exports = {getRois,getAvgs,setRois,setAvgs,createSocketServer};