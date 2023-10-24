
const path = require('path'); 
const dataPreperation = (data) => {
   
    const processJSONData = (data) => {
        // Extract the parking name
        data['parking_name'] = "Student residences";
    
        // Calculate centroids
        let x_coords = [];
        let y_coords = [];
        data.slots.forEach(slot => {
            let center = calculateCenter(slot.coordinate);
            x_coords.push(center.x);
            y_coords.push(center.y);
        });
    
        
        
        data.slots.forEach(slot => {
            //shorten the filename property hence it ia a full path
            slot.filename = path.basename(slot.filename) 
        });
    
        return data;
    }
    
    const calculateCenter = (coordinate) => {
        let xCenter = parseInt(coordinate.x1) + parseInt(coordinate.w) / 2;
        let yCenter = parseInt(coordinate.y1) + parseInt(coordinate.h) / 2;
        return {
            x: xCenter,
            y: yCenter
        };
    }

return processJSONData(data);

};


module.exports = {
   dataPreperation,
};