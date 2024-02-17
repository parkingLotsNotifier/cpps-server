const schedule = require('node-schedule');
const express = require('express');
const GDriveUploader = require('./dcc-src/upload/GDriveUploader');
const cors = require('cors');
const { PORT, ...rest } = require('./config/env');
const { onPipelineFinished, onPipelineError, emitPipelineClose, emitPiplineContinue } = require('./src/events/index');
const {startDCC} = require('../cpps-server/dcc-src/orchestra-conductor/startDCC');
const { getSunrise, getSunset } = require('sunrise-sunset-js');
const { exec } = require('child_process');
const app = express();
const jerusalemCoordinate = {"lat":31.771959,"lng":35.217018};

// Middleware setup
app.use(cors());


// Calculate sunrise and sunset for the current day
let sunSet = getSunset(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
let sunRise = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng);

// Start data collection immediately
startDCC();

// Restart data collection after pipeline finishes or encounters an error
onPipelineFinished(startDCC);
onPipelineError(startDCC);

// Schedule the upload job
schedule.scheduleJob({ hour: sunSet.getHours(), minute: sunSet.getMinutes() }, async () => {
    await performUpload(); // Extract upload logic into a separate async function

    // Decide on next steps based on current time or other conditions
    restartDataCollection();
});

async function performUpload() {
    emitPipelineClose();

    // Your existing upload logic
    const uploader = new GDriveUploader();
    await uploader.authenticate();
    const date = new Date();
    const date_DMY = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const rootDateDir = `/data/data/com.termux/files/home/photos/data-collection/${date_DMY}`;
    await uploader.uploadFolder(rootDateDir);
    console.log('Folder uploaded successfully with the same structure and names');

    exec(`rm -rf ${rootDateDir}`);

  
}

function restartDataCollection() {
    const now = new Date();

    // Example condition: restart immediately if current time is after sunset
    if (now >= sunSet) {
        emitPiplineContinue();
        startDCC();
    } else {
        // Calculate the delay until the condition is met (e.g., until sunset)
        let delayUntilNextStart = sunSet.getTime() - now.getTime();
        setTimeout(() => {
            emitPiplineContinue();
            startDCC();
        }, delayUntilNextStart);
    }
}

app.listen(PORT, () => console.log(`Example app listening on port ${PORT} ${rest.GREETING}`));
