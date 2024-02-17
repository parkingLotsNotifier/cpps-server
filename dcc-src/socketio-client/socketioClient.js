
const { SOCKETIO_ADDRS } = require('../../config/env');
const {createLogger} = require('../../src/logger/logger');
const logger = createLogger("socketioClient");
const io = require("socket.io-client");
const socketServerURL = SOCKETIO_ADDRS;

let socket; // This variable will hold the socket connection

function connect() {
    
    socket = io(socketServerURL);
    
    // Initialize connection only if it hasn't been established
    if (!socket) {
        socket.on("connect", () => {
            logger.verbose("Connected to Socket.IO server!");
        });
        
        socket.on("error",(error)=>{
            logger.error(error);
        })

    }


    return socket;
}

module.exports = { connect };
