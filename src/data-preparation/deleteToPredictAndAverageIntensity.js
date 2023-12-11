const deleteToPredictAndAverageIntensity = (newData)=>{

    newData.slots.forEach((slot) => {
        isToPredictExist = slot.hasOwnProperty('toPredict');
        if(isToPredictExist){
            delete slot['toPredict'];
        }
        delete slot['averageIntensity'];
    });
    return newData;
}

module.exports = {
     deleteToPredictAndAverageIntensity
};