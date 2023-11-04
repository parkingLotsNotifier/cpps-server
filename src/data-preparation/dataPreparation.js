
const dataPreparation = (newData, oldData) => {

    const processJSONData = (newData,oldData) => {
        // Extract the parking name
        newData['parking_name'] = "Student residences";
    
        // Calculate centroids
        let x_coords = [];
        let y_coords = [];
        newData.slots.forEach((slot, index) => {
            let center = calculateCenter(slot.coordinate);
            x_coords.push(center.x);
            y_coords.push(center.y);
            
            // Check if toPredict flag is false
            if (slot.toPredict === false ) {
                // Copy prediction from oldData to newData
                if (oldData.slots[index] && oldData.slots[index].prediction) {
                    slot.prediction = oldData.slots[index].prediction;
                }
                
            }
            

            // Delete hash and toPredict fields
            delete slot.hash_value;  // Assuming the field is named 'hash_value'
            delete slot.toPredict;
        });
    
        return newData;
    }
    
    const calculateCenter = (coordinate) => {
        let xCenter = parseInt(coordinate.x1) + parseInt(coordinate.w) / 2;
        let yCenter = parseInt(coordinate.y1) + parseInt(coordinate.h) / 2;
        return {
            x: xCenter,
            y: yCenter
        };
    }

    return processJSONData(newData,oldData);
};

module.exports = {
    dataPreparation,
};
