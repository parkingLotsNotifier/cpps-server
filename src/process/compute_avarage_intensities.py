import sys
import cv2
import os
import json
import base64
import ast
import numpy as np
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("compute_avarage_intensities")

# Read the large data (rois) from stdin
stdin = sys.stdin.read()
rois_base64 = ast.literal_eval(stdin)

avgs = []

def compute_average_intensity(roi):
    # Calculate the average value
    avg = roi.mean()
    return avg  

try:
    for roi_base64 in rois_base64:
        # Decode the base64 encoded image
        roi = base64.b64decode(roi_base64)
        roi = cv2.imdecode(np.frombuffer(roi, np.uint8), cv2.IMREAD_COLOR)

        avgs.append(compute_average_intensity(roi))
    
    
    logger.info(f"Sending IPC message: {avgs}")
    print(avgs)
    sys.stdout.flush()
    sys.exit(0)        

except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        message = {'error': str(e)}
        print(json.dumps(message))
        sys.stdout.flush()
        sys.exit(1)
