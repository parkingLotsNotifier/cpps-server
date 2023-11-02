function compareHashes(oldMessage, newMessage) {
    const threshold = 5;
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
        newSlot.toPredict = Math.abs(oldSlot.hash_value - newSlot.hash_value) > threshold ? true:false;
    }
       
    return newMessage;  // Return the updated newMessage with toPredict flags set
}
  
module.exports = {
    compareHashes
 };