from crop_utils import convert_coordinate_float_to_int
from  slot_utils import create_slot, compute_average_intensity, create_cropped_file_name
import sys
import cv2
import os
import json
import base64
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("filenames_crop_save_avg_append")

slots = []
avgs=[]

src_path,img_name,dest_path,basic_data,cropped_pic_names = sys.argv[1:6]
basic_data = json.loads(basic_data)
cropped_pic_names = json.loads(cropped_pic_names)
image = cv2.imread(f'{src_path}/{img_name}.jpg')

def crop(coordinate):
    x1, y1, w, h = coordinate 
    return image[y1:y1 + h, x1:x1 + w, :]
def encode(roi):
    # Encode the roi with quality preservetion
    _, buffer = cv2.imencode('.jpg', roi, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
def save_pic(idx, roi):
    # * save cropped image to file
    filename_with_path = os.path.join(dest_path, f'{cropped_pic_names[idx]}')
    cv2.imwrite(filename_with_path, roi) 
    return filename_with_path                 
def append_slots(idx,itm):
            #create slot
            slots.append(create_slot(cropped_pic_names[idx],itm['bbox'],itm['lotName'],avgs[idx]))
        
try:
    for idx,itm in enumerate(basic_data):
            # prepare the indeces to crop  
            int_bbox = convert_coordinate_float_to_int(itm['bbox'])
            roi = crop(int_bbox)
            
            # the encode is preperation for future use , then we wont need to predict from actual img 
            #encode(roi)
            save_pic(idx, roi)
            
            # * prepare the data for the next phase in cpps
            # build slot
            slot = compute_average_intensity(roi)
            avgs.append(slot)
            
            append_slots(idx,itm)
                  

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



    

    
    
    
    
    

