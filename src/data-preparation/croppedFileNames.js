const generateCroppedPicNames = (basePicName,numOfPics) => {
    croppedPicNames=[]
    for(let i=0;i<numOfPics;i++){
        croppedPicNames.push(`${basePicName}_${i}.jpg`);
    }
    return croppedPicNames  
}

module.exports = {generateCroppedPicNames}