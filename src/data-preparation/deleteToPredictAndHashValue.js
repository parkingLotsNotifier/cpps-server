const deleteToPredictAndHashValue = (newData)=>{

    newData.slots.forEach((slot) => {
        isToPredictExist = slot.hasOwnProperty('toPredict');
        if(isToPredictExist){
            delete slot['toPredict'];
        }
        delete slot['hash_value'];
    });
    return newData;
}

module.exports = {
    deleteToPredictAndHashValue
};