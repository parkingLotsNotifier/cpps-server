import sys
import cv2
import os
import json
import base64
from  slot_utils import create_slot, compute_average_intensity, create_cropped_file_name
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("create_slots")

slots = []

img_name,basic_data,cropped_pic_names,avgs = sys.argv[1:5]

basic_data = json.loads(basic_data)
cropped_pic_names = json.loads(cropped_pic_names)
avgs = json.loads(avgs)

def append_slots(cropped_pic_name,itm,avg):
            #create slot
            slots.append(create_slot(cropped_pic_name,itm['bbox'],itm['lotName'],avg))

try:

    for cropped_pic_name , itm ,avg in zip(cropped_pic_names,basic_data,avgs):
            append_slots(cropped_pic_name,itm,avg)



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