const fse = require("fs-extra");
const { ROOT_FOLDER_PATH, ...rest } = require('../../config/env');

class Init {
  #_date;
  #_date_DMY;
  #_rootPhotosDir;
  #_rootDateDir;
  #_srcPicturePath;
  #_destCroppedPicturesPath;
  #_occupiedPath;
  #_unoccupiedPath;

  constructor() {
    if (!Init.instance) {
      this.#_date = new Date();
      this.createPaths();
      this.createFolderStructure();
      Init.instance = this;
    }
    return Init.instance;
  }

  // Getters
  get date() {
    return this.#_date;
  }

  get dateDMY() {
    return this.#_date_DMY;
  }

  get rootPhotosDir() {
    return this.#_rootPhotosDir;
  }

  get rootDateDir() {
    return this.#_rootDateDir;
  }

  get srcPicturePath() {
    return this.#_srcPicturePath;
  }

  get destCroppedPicturesPath() {
    return this.#_destCroppedPicturesPath;
  }

  get occupiedPath() {
    return this.#_occupiedPath;
  }

  get unoccupiedPath() {
    return this.#_unoccupiedPath;
  }

  // Setters
  set date(date) {
    this.#_date = date;
  }

  // Method to update and initialize paths
  createPaths() {
    this.#_date_DMY = `${this.#_date.getDate()}-${this.#_date.getMonth() + 1}-${this.#_date.getFullYear()}`;
    this.#_rootPhotosDir = `${ROOT_FOLDER_PATH}/photos`;
    this.#_rootDateDir = `${this.#_rootPhotosDir}/data-collection/${this.#_date_DMY}`;
    this.#_srcPicturePath = `${this.#_rootDateDir}/original`;
    this.#_destCroppedPicturesPath = `${this.#_rootDateDir}/cropped`;
    this.#_occupiedPath = `${this.#_destCroppedPicturesPath}/occupied`;
    this.#_unoccupiedPath = `${this.#_destCroppedPicturesPath}/unoccupied`;
  }

  // Method to create folders if they do not exist
  createFolderStructure() {
    const paths = [
      this.#_rootPhotosDir,
      this.#_rootDateDir,
      this.#_srcPicturePath,
      this.#_destCroppedPicturesPath,
      this.#_occupiedPath,
      this.#_unoccupiedPath,
    ];

    paths.forEach((dirPath) => {
      fse.ensureDirSync(dirPath);
    });
  }
}

// Ensure the singleton instance is exported
const instance = new Init();
Object.freeze(instance);
module.exports = instance;
