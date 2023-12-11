function compareAverageIntensity(oldMessage, newMessage,threshold) {
    
    if (!oldMessage || !newMessage || !Array.isArray(oldMessage.slots) || !Array.isArray(newMessage.slots)) {
        throw new Error('Invalid messages provided.');
    }

    // Ensure both old and new messages have the same number of slots
    if (oldMessage.slots.length !== newMessage.slots.length) {
        throw new Error('Mismatch in number of slots between old and new messages.');
    }

    // Iterate through each slot and compare hashes
    for (let i = 0; i < oldMessage.slots.length; i++) {
        const oldSlot = oldMessage.slots[i];
        const newSlot = newMessage.slots[i];
        
        // Compare hash values and set the toPredict flag
        //console.log(oldSlot.averageIntensity - newSlot.averageIntensity);
        newSlot.toPredict = Math.abs(oldSlot.averageIntensity - newSlot.averageIntensity) > threshold ? true:false;
    }
    //console.log('--------------');
       
    return newMessage;  // Return the updated newMessage with toPredict flags set
}
  
module.exports = {
    compareAverageIntensity
 };