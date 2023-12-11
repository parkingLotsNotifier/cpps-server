class Slot {
    
    #_lotName = null
    #_coordinate = null  
    #_croppedFilename = null 
    #_roi = null 
    #_prediction = null
    #_averageIntensity = null
    #_toPredict = null
    
    constructor(lotName, coordinate ,croppedFilename,roi,avg) {
        this.#_lotName = lotName;
        this.#_coordinate = coordinate;
        this.#_croppedFilename = croppedFilename;
        this.#_roi = roi;
        this.#_prediction = null;
        this.#_averageIntensity = avg;
        this.#_toPredict = null;
    }

    toString() {
        const obj = {
            lot_name: this.#_lotName,
            coordinate: this.#_coordinate.toString(),
            filename: this.#_croppedFilename,
            //roi: this.#_roi,
            //prediction: this.#_prediction,
            hash_value: this.#_averageIntensity,
            //toPredict: this.#_toPredict
        }
        
        return JSON.stringify(obj);
    }

    get lotName() {
        return this.#_lotName;
    }

    set lotName(value) {
        this.#_lotName = value;
    }

    get croppedFilename() {
        return this.#_croppedFilename;
    }

    set croppedFilename(value) {
        this.#_croppedFilename = value;
    }

    get roi() {
        return this.#_roi;
    }

    set roi(value) {
        this.#_roi = value;
    }

    get coordinate() {
        return this.#_coordinate;
    }

    set coordinate(value) {
        this.#_coordinate = new Coordinate(value);  // Assuming Coordinate is a defined class
    }

    get prediction() {
        return this.#_prediction;
    }

    set prediction(value) {
        this.#_prediction = value;
    }

    get averageIntensity() {
        return this.#_averageIntensity;
    }

    set averageIntensity(value) {
        this.#_averageIntensity = value;
    }

    get toPredict() {
        return this.#_toPredict;
    }

    set toPredict(value) {
        this.#_toPredict = value;
    }
}

module.exports = Slot;