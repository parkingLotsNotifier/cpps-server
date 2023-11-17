import cv2
import json
import base64
import sys
import cv2
import os
import ast
import numpy as np
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("save_pics")

try:
    stdin = sys.stdin.read()
    dest_path,cropped_pic_names= sys.argv[1:3]  
    cropped_pic_names = json.loads(cropped_pic_names)
    rois_base64 = ast.literal_eval(stdin)
 
    
    
    for cropped_name,roi_base64 in zip(cropped_pic_names,rois_base64):
       # Decode the base64 encoded image
        roi = base64.b64decode(roi_base64)
        roi = cv2.imdecode(np.frombuffer(roi, np.uint8), cv2.IMREAD_COLOR)


        filename_with_path = os.path.join(dest_path, f'{cropped_name}')
        cv2.imwrite(filename_with_path, roi) 

    sys.exit(0)


except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        message = {'error': str(e)}
        print(json.dumps(message))
        sys.stdout.flush()
        sys.exit(1)
