const bodyParser = require('body-parser');
const schedule = require('node-schedule');
const express = require('express');
const GDriveUploader = require('./dcc-src/upload/GDriveUploader');
const { PORT, DB_USERNAME, DB_PASSWORD, DB_HOST,TELEGRAM_TOKEN, ...rest } = require('./config/env');
const database = require('./config/database');
const cors = require('cors');
const { onPipelineFinished, onPipelineError , emitPipelineClose} = require('./src/events/index');
 const {startDCC} = require('../cpps-server/dcc-src/orchestra-conductor/startDCC');


database.connect(DB_USERNAME, DB_PASSWORD, DB_HOST).then(() => {
   
    const app = express();
    app.use(cors());
    app.use(bodyParser.json());
    
    
    let test = startDCC();

    onPipelineFinished(startDCC);
    onPipelineError(startDCC);

    schedule.scheduleJob({ hour: 20, minute: 56 }, async () => {
        emitPipelineClose();
        const uploader = new GDriveUploader();
        await uploader.authenticate();
        const date = new Date();
        date_DMY = `${date.getDate()}-${date.getMonth()}-${date.getFullYear()}`
        const rootDateDir = `/data/data/com.termux/files/home/photos/data-collection/${date_DMY}`;
        await uploader.uploadFolder(rootDateDir);
        console.log('Folder uploaded successfully with the same structure and names');
    });
    


    app.listen(PORT, () => console.log(`example app listening on port ${PORT} ${rest.GREETING}`));
});
