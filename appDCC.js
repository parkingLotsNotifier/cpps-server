const schedule = require('node-schedule');
const express = require('express');
const GDriveUploader = require('./dcc-src/upload/GDriveUploader');
const cors = require('cors');
const { PORT, ...rest } = require('./config/env');
const { onPipelineFinished, onPipelineError, emitPipelineClose, emitPiplineContinue } = require('./src/events/index');
const { startDCC } = require('../cpps-server/dcc-src/orchestra-conductor/startDCC');
const { getSunrise, getSunset } = require('sunrise-sunset-js');
const { exec } = require('child_process');
const app = express();
const jerusalemCoordinate = { "lat": 31.771959, "lng": 35.217018 };




// //creating tomorrow's date object by coping  the current one and incrementing it with 1 day.
// const tomorrow = new Date(currentDate);
// tomorrow.setDate(tomorrow.getDate() + 1);

// const sunRiseTomorrow = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng,tomorrow);



// Middleware setup
app.use(cors());

// // Start data collection immediately
// startDCC();

// Listing for 'changeMode' evnet  from server to change mode of DCC
onChangeMode(async () => {
    console.log("Change mode event received.");
    await determineMode();
});

// Restart data collection after pipeline finishes or encounters an error
onPipelineFinished(startDCC);
onPipelineError(startDCC);

// Function to determine mode based on current time
async function determineMode() {
    // Calculate sunrise and sunset for the current day
    const sunSet = getSunset(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
    const sunRise = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
    const currentDate = new Date();

    if (currentDate < sunRise) {
        console.log("Activating upload mode.");
        emitPipelineClose();
        await performUpload();
    } else if (currentDate >= sunRise && currentDate < sunSet) {
        console.log("Activating acquisition mode.");
        emitPiplineContinue();
        startDCC();
    } else if (currentDate >= sunSet) {
        console.log("Activating upload mode.");
        emitPipelineClose();
        await performUpload();
    }
}

// Activate mode based on current time
determineMode();

// // Schedule the upload job
// schedule.scheduleJob({ hour: sunSet.getHours(), minute: sunSet.getMinutes() }, async () => {
//     emitPipelineClose();
//     await performUpload(); // Extract upload logic into a separate async function

//     // Decide on next steps based on current time or other conditions
//     restartDataCollection();
// });

async function performUpload() {
    const uploader = new GDriveUploader();
    await uploader.authenticate();

    const date = new Date();
    const sunRise = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng);

    // Adjust the date if current time is before sunrise (still working on the directory of yasterday's)
    if (date < sunRise) {
        date.setDate(date.getDate() - 1); // Set to the previous day
    }

    const date_DMY = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    const rootDateDir = `/data/data/com.termux/files/home/photos/data-collection/${date_DMY}`;

    const finishedUploading = await uploader.uploadFolder(rootDateDir);
    if (finishedUploading) {
        console.log('Folder uploaded successfully with the same structure, folder is removed from server memory');
    }
}
// function restartDataCollection() {
//     const now = new Date();

//     // Example condition: restart immediately if current time is after sunset
//     if (now >= sunSet) {
//         emitPiplineContinue();
//         startDCC();
//     } else {
//         // Calculate the delay until the condition is met (e.g., until sunset)
//         let delayUntilNextStart = sunSet.getTime() - now.getTime();
//         setTimeout(() => {
//             emitPiplineContinue();
//             startDCC();
//         }, delayUntilNextStart);
//     }
// }

app.listen(PORT, () => console.log(`Example app listening on port ${PORT} ${rest.GREETING}`));
