import cv2
import json
import base64
import sys
import os
import ast
import numpy as np
import socket
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("save_pics")

dest_path,cropped_pic_names,socket_path = sys.argv[1:4]  
  
def request_data_from_server(socket_path):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.connect(socket_path)
        response = sock.recv(50000000)  # Adjust buffer size as needed
        return json.dumps(response.decode())

def decode(roi_base64):
    roi = base64.b64decode(roi_base64)
    roi = cv2.imdecode(np.frombuffer(roi, np.uint8), cv2.IMREAD_COLOR)
    return roi


try:
    
    # Receive data from the parent process
    received_data = request_data_from_server(socket_path)  
    cropped_pic_names = json.loads(cropped_pic_names)
    rois_base64 = received_data.strip('][').split(', ')
   
    for cropped_name,roi_base64 in zip(cropped_pic_names,rois_base64):
       
       # Decode the base64 encoded image
        roi = decode(roi_base64)

        filename_with_path = os.path.join(dest_path, f'{cropped_name}')
        cv2.imwrite(filename_with_path, roi) 

    sys.exit(0)


except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        sys.exit(1)
