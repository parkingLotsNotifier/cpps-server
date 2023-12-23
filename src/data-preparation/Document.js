// Assuming Slot is imported or defined above
const Slot = require('./Slot'); // Example import if Slot is a separate module
const Coordinate = require('./Coordinate');
class Document {
   
    #_filename = null
    #_slots = []
    #_datetime = null
    #_parkingName = null
    constructor(filename,croppedPicNames,rois,avgs,lstOfDictLotNameBbox,parkingName) {
        this.#_filename = filename;
        for( let i=0;i<croppedPicNames.length;i++){
            let coordinate = new Coordinate(...lstOfDictLotNameBbox[i].bbox);
            let slot = new Slot(lstOfDictLotNameBbox[i].lotName,coordinate,croppedPicNames[i],rois[i],avgs[i]);
            this.addSlot(slot);
          }
          this.#_parkingName = parkingName;
    }

    toString() {
        // Convert each slot to its string representation (assuming each slot has a toString method)
        const slotsStr = this.#_slots.map(slot => slot.toString());
    
        // Create an object that represents your class instance
        const obj = {
            fileName: this.#_filename,
            slots: slotsStr,
            //datetime: this.#_datetime
        };
    
        // Convert the object to a JSON string
        return JSON.stringify(obj, null, 2); // The 'null' and '2' arguments format the JSON for readability
    }
    

    get slots() {
        return this.#_slots;
    }

    get datetime() {
        return this.#_datetime;
    }

    get filename() {
        return this.#_filename;
    }

    set datetime(datetime) {
        this.#_datetime = datetime;
    }

    addSlot(slot) { 
        this.#_slots.push(slot);
    }

    cpPredictOldToNew(oldDoc, index, slot) {
        if (oldDoc.slots[index] && oldDoc.slots[index].prediction) {
            slot.prediction = oldDoc.slots[index].prediction;
        }
    }

    cpPredictOldToNewBeforeStore(oldDoc){
        if(oldDoc != undefined){
            this.slots.forEach((slot, index) => {
            
    
                if ( slot.toPredict===null || slot.toPredict === false ) {
                    
                    // Copy prediction from oldDoc to this
                
                    this.cpPredictOldToNew(oldDoc, index, slot);
                    
                }
                
            });
    }
        
    };

    compareAverageIntensity(oldMessage, threshold) {
    
        if (!oldMessage  || !Array.isArray(oldMessage.slots) || !Array.isArray(this.slots)) {
            throw new Error('Invalid messages provided.');
        }
    
        // Ensure both old and new messages have the same number of slots
        if (oldMessage.slots.length !== this.slots.length) {
            throw new Error('Mismatch in number of slots between old and new messages.');
        }
    
        // Iterate through each slot and compare hashes
        for (let i = 0; i < oldMessage.slots.length; i++) {
            const oldSlot = oldMessage.slots[i];
            const newSlot = this.slots[i];
            
            // Compare hash values and set the toPredict flag
            //console.log(oldSlot.averageIntensity - newSlot.averageIntensity);
            newSlot.toPredict = Math.abs(oldSlot.averageIntensity - newSlot.averageIntensity) > threshold ? true:false;
        }
        //console.log('--------------');
           
        return this;  // Return the updated newMessage with toPredict flags set
    }
    

}

module.exports=Document;