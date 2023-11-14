const fs = require('fs');

class Blueprint {
    _blueprintFilePath;
    _blueprintData;
    _annotations;
    _categories;
    _categoryIdToBbox;
    _categoryNameToBbox = [];

    constructor(jsonFilePath) {
        this._blueprintFilePath = jsonFilePath;
        this._blueprintData = this.parseBlueprint();
        this._annotations = this.extractAnnotations();
        this._categories = this.extractCategories();
        this._categoryIdToBbox = this.mapCategoryIdToBbox();
        
        //category_id represent the index the category name in categories 
        this._categoryNameToBbox=this.mapLotNameToBbox();
    }

    parseBlueprint() {
        let rawData = fs.readFileSync(this._blueprintFilePath);
        return JSON.parse(rawData);
    }

    extractAnnotations() {
        try {
            return this._blueprintData.annotations.map(annotation => ({
                categoryId: annotation.category_id,
                bbox: annotation.bbox
            }));
        } catch (error) {
            throw error;
        }
    }

    extractCategories() {
        try {
            return this._blueprintData.categories.map(category => ({
                id: category.id,
                name: category.name
            }));
        } catch (error) {
            throw error;
        }
    }

    mapCategoryIdToBbox() {
                                    //(accumulator,currentValue)
        return this._annotations.reduce((map, annotation) => {
            map[annotation.categoryId] = annotation.bbox;
            return map;
        }, {});
    }

    mapLotNameToBbox() {
        try {
            let result = []
            this._categories.forEach(category => { 
                let catName = category.name;
                let bbox = this._categoryIdToBbox[category.id];
                result.push({ lotName: catName, bbox: bbox });
            });
            return result
        } catch (error) {
            throw error;
        }
    }

    get categoryNameToBbox() {
        return this._categoryNameToBbox;
    }
}

module.exports = Blueprint;
