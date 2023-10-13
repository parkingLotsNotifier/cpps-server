
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
    
        let centroid1 = {
            x: Math.min(...x_coords),
            y: y_coords[x_coords.indexOf(Math.min(...x_coords))]
        };
    
        let centroid2 = {
            x: Math.max(...x_coords),
            y: y_coords[x_coords.indexOf(Math.max(...x_coords))]
        };
    
        // Calculate slope and y-intercept of the diagonal
        let m = (centroid2.y - centroid1.y) / (centroid2.x - centroid1.x);
        let c = centroid1.y - m * centroid1.x;
    
        // Process each slot
        let countA = 1;
        let countB = 1;
        data.slots.forEach(slot => {
            // Calculate and add the center coordinates
            let center = calculateCenter(slot.coordinate);
            slot.coordinate.center = center;
    
            // Determine if the center is above or below the diagonal
            if (center.y > m * center.x + c) {
                slot.lot_name = 'B' + countB++;
            } else {
                slot.lot_name = 'A' + countA++;
            }
            
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