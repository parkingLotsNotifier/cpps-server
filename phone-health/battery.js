const exec = require('child_process').exec;
const { createLogger } = require('../src/logger/logger');  

const batteryLogger = createLogger('battery');

function checkBatteryStatus() {
    return new Promise((resolve, reject) => {
        exec('termux-battery-status', (error, stdout, stderr) => {
            if (error) {
                batteryLogger.error(`Exec error: ${error}`);
                return reject(error);
            }

            try {
                const batteryStatus = JSON.parse(stdout);

                if (batteryStatus.status !== "CHARGING" && batteryStatus.percentage !== 100) {
                    batteryLogger.error(`Battery is not charging and its precentege ${batteryStatus.percentage} `);
                }

                resolve(batteryStatus);

            } catch (parseError) {
                batteryLogger.error('Failed to parse battery status:', parseError);
                reject(parseError);
            }
        });
    });
}

module.exports = checkBatteryStatus;
