
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

const emitPipelineFinished = () => {
    eventEmitter.emit('pipelineFinished');
};

const onPipelineFinished = (handler) => {
    eventEmitter.on('pipelineFinished', handler);
};

const emitPipelineError = (error) => {
    eventEmitter.emit('pipelineError', error);
};

const onPipelineError = (handler) => {
    eventEmitter.on('pipelineError', handler);
};

module.exports = {
    emitPipelineFinished,
    onPipelineFinished,
    emitPipelineError,
    onPipelineError
};
