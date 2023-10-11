const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class FifoListener extends EventEmitter {
    constructor(directory) {
        super();
        this.directory = directory;
    }

    start() {
        const fifoFiles = fs.readdirSync(this.directory).filter(file => file.endsWith('.fifo'));

        fifoFiles.forEach(fifoFile => {
            const fullPath = path.join(this.directory, fifoFile);
            console.log(`Listening to FIFO file: ${fullPath}`);
            const stream = fs.createReadStream(fullPath);
            
            stream.on('data', (data) => {
                console.log(`Received from ${fifoFile}: ${data.toString()}`);
                this.emit('message', { fifo: fifoFile, message: data.toString() });
            });
        });
    }
}

function fifoMiddleware(directory) {
    const listener = new FifoListener(directory);
    listener.start();

    return (req, res, next) => {
        req.fifoListener = listener;
        next();
    };
}

module.exports = fifoMiddleware;
