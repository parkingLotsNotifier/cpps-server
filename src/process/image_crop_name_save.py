import os
import cv2
import sys
import json
import numpy as np
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/') #TODO: is there a way to shorten it ? 
from logger.logger import setup_logger

logger = setup_logger("crop")
blueprint_json_path = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'


def compute_average_intensity(image):
    # Calculate the average value
    avg = image.mean()
    return avg



#TODO: process_image needs to be reconstructed into sub functions
def process_image(src_path,img_name,dest_path):
    try:
        
        os.makedirs(dest_path, exist_ok=True)

        with open(blueprint_json_path, 'r') as json_file:
            data = json.load(json_file)

        slots = []
        for obj in data['annotations']:
            x1, y1, w, h = obj['bbox']
            category_id = obj['category_id']
            slots.append([x1, y1, w, h, category_id])

        image = cv2.imread(f'{src_path}/{img_name}.jpg')

        slot_data = []
        for slot_nmr, slot in enumerate(slots):
            x1, y1, w, h, category_id = slot
            
            # Convert x1, y1, w, and h to integers
            x1, y1, w, h = int(x1), int(y1), int(w), int(h)
            
            roi = image[y1:y1 + h, x1:x1 + w, :]
            filename = os.path.join(dest_path, f'{img_name}_{str(slot_nmr).zfill(8)}.jpg')
            cv2.imwrite(filename, roi)

            # Compute the hash of the cropped image
            avg = compute_average_intensity(roi)

            # Get the category name based on category_id
            category_name = next((cat['name'] for cat in data['categories'] if cat['id'] == category_id), None)

            # Append slot data
            slot_data.append({
                'filename': os.path.basename(filename),
                'coordinate': {
                    'x1': str(x1),
                    'y1': str(y1),
                    'w': str(w),
                    'h': str(h)
                },
                'lot_name': category_name,  # Assign the category name
                'hash_value': avg    # Store the hash value
            })

        message = {
            'file_name': img_name,
            'slots': slot_data
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

if __name__ == "__main__":
    if len(sys.argv) != 4:
        error_message = "Usage: python3 crop.py <src_path> <img_name> <dest_path>"
        logger.error(error_message)
        sys.exit(1)

    src_path,img_name,dest_path = sys.argv[1:4]
    process_image(src_path,img_name,dest_path)
