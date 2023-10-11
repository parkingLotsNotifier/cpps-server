const Jimp = require('jimp');
const { rejections } = require('winston');

async function rotateImage(filePath) {
    try {
        const image = await Jimp.read(filePath);
        await image.rotate(90).writeAsync(filePath);
        return true ;
    } catch (error) {
        reject(new Error(error)) ;
    }
}

module.exports = {
    rotateImage
};
