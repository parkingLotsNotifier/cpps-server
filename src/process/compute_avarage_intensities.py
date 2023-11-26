import sys
import cv2
import os
import json
import base64
import ast
import socket
import numpy as np
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("compute_avarage_intensities")

def client_connect(socket_path):
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) 
    client.connect(socket_path)
    return client

def get_data_from_unix_socket(client):
    response = client.recv(500000)  # Adjust buffer size as needed
    return json.dumps(response.decode())

def post_data_to_unix_socket(client,data):
    jsonData = json.dumps(data).encode()
    client.sendall(jsonData)  # Send all data
    
def compute_average_intensity(roi):
    # Calculate the average value
    avg = roi.mean()
    return avg  

# Read the large data (rois) from stdin

socket_path = sys.argv[1]
client = client_connect(socket_path)

rois_base64=get_data_from_unix_socket(client)
rois_base64=rois_base64.strip('][').split(', ')
avgs = []

try:
    for roi_base64 in rois_base64:
        # Decode the base64 encoded image
        roi = base64.b64decode(roi_base64)
        roi = cv2.imdecode(np.frombuffer(roi, np.uint8), cv2.IMREAD_COLOR)
    
        avgs.append(compute_average_intensity(roi))
    
    logger.info('49')
    post_data_to_unix_socket(client,avgs)
    
    sys.exit(0)        

except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        message = {'error': str(e)}
        print(json.dumps(message))
        sys.stdout.flush()
        sys.exit(1)
