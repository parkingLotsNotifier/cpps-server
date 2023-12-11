// Assuming Slot is imported or defined above
const Slot = require('./Slot'); // Example import if Slot is a separate module

class Document {
   
    #_filename = null
    #_slots = []
    #_datetime = null
    constructor(filename) {
        this.#_filename = filename;
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

    addSlot(slot) { // Renamed from 'slots' for clarity
        this.#_slots.push(slot);
    }
}

module.exports=Document;