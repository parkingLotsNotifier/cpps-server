from Blueprint import Blueprint
from UtilsBlueprintBasicData import UtilsBlueprintBasicData
from crop_utils import convert_coordinate_float_to_int, crop
from  slot_utils import create_slot, compute_average_intensity, create_cropped_file_name
import sys
import cv2
import os
import json
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger

logger = setup_logger("orchestrate")
blueprint_json_path = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
slots = []
src_path,img_name,dest_path = sys.argv[1:4]
logger.info(f"dest path: {dest_path}")
try:
    # raw blueprint data
    blueprint=Blueprint()
    blueprint.parse_blueprint_and_save_data(blueprint_json_path)
    blueprint = blueprint.get_blueprint_data()

    # extract blueprint data into basic data as a preperation step for the crop and slot data
    utils_basic_data = UtilsBlueprintBasicData(blueprint,['categories','annotations'])
    utils_basic_data.import_attr_from_blueprint_data()
    utils_basic_data.process_inner_data_dict_basic_data()
    basicdata = utils_basic_data.list_final_basic_data

    image = cv2.imread(f'{src_path}/{img_name}.jpg')


    for idx,itm in enumerate(basicdata):
        
        #prepare the indeces to crop
        x1, y1, w, h = itm['bbox']
        x1, y1, w, h = convert_coordinate_float_to_int(x1, y1, w, h)

        
        # * crop
        roi = crop(image,[x1, y1, w, h])
        

        # * prepare the data for the next phase in cpps

        lot_name = itm['lot_name']
        avg = compute_average_intensity(roi)

        #name
        cropped_file_name=create_cropped_file_name(img_name,idx)

        #create slot
        slot = create_slot(cropped_file_name,[x1, y1, w, h],lot_name,avg)
        
        slots.append(slot)
        
        # * save cropped image to file
        filename_with_path = os.path.join(dest_path, f'{cropped_file_name}')
        cv2.imwrite(filename_with_path, roi)

    message = {
                'file_name': img_name,
                'slots': slots
            }
    logger.info(f"Sending IPC message: {json.dumps(message)}")
    print(json.dumps(message))
    sys.stdout.flush()
    sys.exit(0)        

except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        message = {
            'error': str(e)
        }
        print(json.dumps(message))
        sys.stdout.flush()
        sys.exit(1)



    

    
    
    
    
    

