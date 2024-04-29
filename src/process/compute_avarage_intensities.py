import sys
import cv2
import os
import json
import base64
import ast
import socket
import numpy as np

sys.path.append(
    "/data/data/com.termux/files/home/project-root-directory/cpps-server/src/"
)
from logger.logger import setup_logger

logger = setup_logger("compute_avarage_intensities")


def get_data_from_unix_socket():
    response = b""
    server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    server.connect(socket_path)
    server.sendall(b"get rois")
    logger.info("23")
    while True:
        chunk = server.recv(4096)  # Receive data in chunks of 4096 bytes
        if not chunk:
            break
        response += chunk

    server.close()
    logger.info(len(response))
    return json.dumps(response.decode())


def post_data_to_unix_socket(data):
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    client.connect(socket_path)
    client.sendall(b"post avgs\n")
    jsonData = json.dumps(data).encode()
    client.sendall(jsonData)  # Send all data
    client.close()


def compute_average_intensity(roi):
    # Calculate the average value
    avg = roi.mean()
    return avg


# Read the large data (rois) from stdin

socket_path = sys.argv[1]

logger.info("39")
rois_base64 = get_data_from_unix_socket()
logger.info("41")
rois_base64 = rois_base64.strip("][").split(", ")
avgs = []

try:
    for roi_base64 in rois_base64:
        # Decode the base64 encoded image
        roi = base64.b64decode(roi_base64)
        roi = cv2.imdecode(np.frombuffer(roi, np.uint8), cv2.IMREAD_COLOR)

        avgs.append(compute_average_intensity(roi))

    logger.info("49")
    post_data_to_unix_socket(avgs)

    sys.exit(0)

except Exception as e:
    error_message = f"An error occurred: {e}"
    logger.error(error_message)
    message = {"error": str(e)}
    print(json.dumps(message))
    sys.stdout.flush()
    sys.exit(1)
