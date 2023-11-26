from crop_utils import convert_coordinate_float_to_int
from  slot_utils import create_slot, compute_average_intensity, create_cropped_file_name
import sys
import cv2
import os
import json
import base64
import socket

sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger
logger = setup_logger("crop_pics")

src_path,img_name,basic_data,socket_path = sys.argv[1:5]
logger.info(socket_path)
basic_data=json.loads(basic_data)

rois=[]

def send_data_unix_socket(socket_path, data):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.connect(socket_path)
        jsonData = json.dumps(data).encode()
        sock.sendall(jsonData)  # Send all data
        
def encode(roi):
    # Encode the roi with quality preservetion
    _, buffer = cv2.imencode('.jpg', roi, [int(cv2.IMWRITE_JPEG_QUALITY), 100])
    encoded_img = base64.b64encode(buffer).decode('utf-8')
    return encoded_img

def crop(coordinate):
    x1, y1, w, h = coordinate 
    return image[y1:y1 + h, x1:x1 + w, :]

image = cv2.imread(f'{src_path}/{img_name}.jpg')

try:
    for itm in basic_data:
            
            # prepare the indeces to crop  
            int_bbox = convert_coordinate_float_to_int(itm['bbox'])
            roi = crop(int_bbox)
    
            # encode step is encode the data to send via unix domain socket
            encode_roi = encode(roi)
            rois.append(encode_roi)
            logger.info(len(encode_roi))
    
    send_data_unix_socket(socket_path, rois)
    

except Exception as e:
        error_message = f"An error occurred: {e}"
        logger.error(error_message)
        send_data_unix_socket(socket_path, error_message)
       
