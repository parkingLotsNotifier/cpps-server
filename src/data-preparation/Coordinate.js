class Coordinate {
    #_x1 = 0
    #_y1 = 0
    #_w = 0
    #_h = 0
    
    constructor(x1, y1, w, h) {
        this.#_x1 = x1;
        this.#_y1 = y1;
        this.#_w = w;
        this.#_h = h;
    }

    toString() {
        const obj = {
            x1:this.#_x1,
            y1:this.#_y1,
            w: this.#_w, 
            h: this.#_h
        }
        return JSON.stringify(obj);
    }

    get x1() {
        return this.#_x1;
    }

    set x1(value) {
        this.#_x1 = value;
    }

    get y1() {
        return this.#_y1;
    }

    set y1(value) {
        this.#_y1 = value;
    }

    get w() {
        return this.#_w;
    }

    set w(value) {
        this.#_w = value;
    }

    get h() {
        return this.#_h;
    }

    set h(value) {
        this.#_h = value;
    }

    convertCoordinateToInt(){
        return [Math.trunc(this.#_x1),Math.trunc(this.#_y1),Math.trunc(this.#_w),Math.trunc(this.#_h)]
    }
}

module.exports = Coordinate;
