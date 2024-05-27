const express = require("express");
const GDriveUploader = require("./dcc-src/upload/GDriveUploader");
const cors = require("cors");
const { PORT, ...rest } = require("./config/env");
const { onChangeMode, onPipelineFinished, onPipelineError, emitPipelineClose, emitPiplineContinue } = require("./src/events/index");
const init = require("./src/utils/Init");
const { startDCC } = require("../cpps-server/dcc-src/orchestra-conductor/startDCC");
const { getSunrise, getSunset } = require("sunrise-sunset-js");
const app = express();


const jerusalemCoordinate = { lat: 31.771959, lng: 35.217018 };

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

function checksIfAcquisitionTime() {
  const now = new Date();
  const sunrise = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
  const sunset = getSunset(jerusalemCoordinate.lat, jerusalemCoordinate.lng);

  //DEBUGGING
  // Define hardcoded sunrise time
  // const sunrise = new Date();
  // sunrise.setHours(6, 30, 0); // Assuming sunrise is at 6:30 AM

  // // Set currentDate to one minute before sunrise
  // const now = new Date(sunrise.getTime() - 60000); // Subtract 60,000 milliseconds (1 minute)

  // // Define a sunset time for completeness
  // const sunset = new Date();
  // sunset.setHours(19, 30, 0); // Assuming sunset is at 7:30 PM

  // Checking if current time is between sunrise and sunset
  if (now >= sunrise && now <= sunset) {
    return true;
  } else {
    return false;
  }
}

// // Restart data collection after pipeline finishes or encounters an error
// onPipelineFinished(startDCC);
// onPipelineError(startDCC);
// Restart data collection after pipeline finishes or encounters an error
onPipelineFinished(async () => {
    if (checksIfAcquisitionTime()) { await startDCC(); } else { await determineMode(); }
});
onPipelineError(async () => {
    if (checksIfAcquisitionTime()) { await startDCC(); }
    else { await determineMode(); }
});
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

  let date = new Date();
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

  //updating to real-time date before calculation
  date = new Date();

  // If the current time is after today's sunrise, set sunrise to the next day's sunrise
  if (date.getTime() > sunRise.getTime())
    sunRise.setDate(sunRise.getDate() + 1);

  let delayUntilNextStart = Math.abs(sunRise.getTime() - date.getTime());

  // Convert delay from milliseconds to hours and minutes
  let hours = Math.floor(delayUntilNextStart / (1000 * 60 * 60));
  let minutes = Math.floor((delayUntilNextStart % (1000 * 60 * 60)) / (1000 * 60));
  console.log(`Delay until next start: ${hours} hours and ${minutes} minutes`);
  setTimeout(() => {
    determineMode();
  }, delayUntilNextStart);
}

// Function to determine mode based on current time
async function determineMode() {
  try {
    // Calculate sunrise and sunset for the current day

    const sunSet = getSunset(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
    const sunRise = getSunrise(jerusalemCoordinate.lat, jerusalemCoordinate.lng);
    const currentDate = new Date();

    //DEBUGGING
    // Define hardcoded sunrise time
    // const sunRise = new Date();
    // sunRise.setHours(6, 30, 0); // Assuming sunrise is at 6:30 AM

    // // Set currentDate to five minutes after sunrise
    // const currentDate = new Date(sunRise.getTime() + 300000); // Add 300,000 milliseconds (5 minutes)

    // // Define a sunset time for completeness
    // const sunSet = new Date();
    // sunSet.setHours(19, 30, 0); // Assuming sunset is at 7:30 PM

    // Log for debugging
    console.log(`Sunrise: ${sunRise},\n Sunset: ${sunSet},\n Current time: ${currentDate}`);

    console.log("after sunset and sunrise calculation");
    if (currentDate < sunRise) {
      console.log("Activating upload mode.");
      emitPipelineClose();
      await performUpload();
    } else if (currentDate >= sunRise && currentDate < sunSet) {
      console.log("Activating acquisition mode.");
      init.createPaths();
      init.createFolderStructure();
      emitPiplineContinue(); // Fix the spelling here if necessary
      await startDCC();
    } else if (currentDate >= sunSet) {
      console.log("Activating upload mode.");
      emitPipelineClose();
      await performUpload();
    }
  } catch (error) {
    console.error(`Error in determineMode: ${error.message}`);
  }
}

// Activate mode based on current time
determineMode();

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
