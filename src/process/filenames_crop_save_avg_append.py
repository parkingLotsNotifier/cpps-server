from crop_utils import convert_coordinate_float_to_int, crop
from  slot_utils import create_slot, compute_average_intensity, create_cropped_file_name
import sys
import cv2
import os
import json
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("filenames_crop_save_avg_append")
blueprint_json_path = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'

slots = []
cropped_file_names=[]
avgs=[]

src_path,img_name,dest_path,basic_data = sys.argv[1:5]
basic_data = json.loads(basic_data)

def cropped_filenames():
    for idx,itm in enumerate(basic_data):
        #names
        cropped_file_names.append(create_cropped_file_name(img_name,idx) )
       
def crop_save_avg():
    image = cv2.imread(f'{src_path}/{img_name}.jpg')

    for idx,itm in enumerate(basic_data):
        

        #prepare the indeces to crop  
        int_bbox = convert_coordinate_float_to_int(itm['bbox'])
        
        # * crop
        roi = crop(image,int_bbox)
    
        # * save cropped image to file
        filename_with_path = os.path.join(dest_path, f'{cropped_file_names[idx]}')
        cv2.imwrite(filename_with_path, roi) 
    
        # * prepare the data for the next phase in cpps
        # build slot
        avgs.append(compute_average_intensity(roi))
            
def append_slots():
        for idx,itm in enumerate(basic_data):
            #create slot
            slots.append(create_slot(cropped_file_names[idx],itm['bbox'],itm['lotName'],avgs[idx]))
        
try:

    cropped_filenames()
    crop_save_avg()
    append_slots()
                  

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



    

    
    
    
    
    

