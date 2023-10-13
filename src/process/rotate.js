const { exec } = require('child_process');

function rotateImage(filePath) {
    return new Promise((resolve, reject) => {
        exec(`convert ${filePath} -rotate 90 ${filePath}`, (error) => {
            if (error) {
                reject(new Error(error));
            } else {
                resolve(true);
            }
        });
    });
}

module.exports = {
    rotateImage
};
