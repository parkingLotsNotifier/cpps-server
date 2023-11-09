
//TODO:reconstruct function
const dataPreparation = (newData, oldData) => {

    // Extract the parking name
    newData['parking_name'] = "Student residences";
    
    newData.slots.forEach((slot, index) => {
        
        // first check if toPredict exist 
        isToPredictExist = slot.hasOwnProperty('toPredict')
        
        // Check if toPredict flag is false
        if ( isToPredictExist && slot.toPredict === false ) {
            
            // Copy prediction from oldData to newData
            if (oldData.slots[index] && oldData.slots[index].prediction) {
                slot.prediction = oldData.slots[index].prediction;
            }
           
        }
        
    });
    return newData
};



module.exports = {
    dataPreparation,
};
