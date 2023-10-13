import os
import cv2
import sys
import json
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger

logger = setup_logger("crop")

def process_image(image_path):
    try:
        output_dir = '/data/data/com.termux/files/home/photos/cropped'
        mask_path = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/mask.png'
        
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        mask = cv2.imread(mask_path, 0)
        analysis = cv2.connectedComponentsWithStats(mask, 4, cv2.CV_32S)
        (totalLabels, label_ids, stats, centroids) = analysis
        
        slots = []
        for i in range(1, totalLabels):
            x1 = stats[i, cv2.CC_STAT_LEFT]
            y1 = stats[i, cv2.CC_STAT_TOP]
            w = stats[i, cv2.CC_STAT_WIDTH]
            h = stats[i, cv2.CC_STAT_HEIGHT]
            slots.append([x1, y1, w, h])
        
        image_name = os.path.splitext(os.path.basename(image_path))
        image_name = str(image_name[0]+image_name[1])
        image = cv2.imread(image_path + '.jpg')
        
        slot_data = []
        for slot_nmr, slot in enumerate(slots):
            roi = image[slot[1]:slot[1] + slot[3], slot[0]:slot[0] + slot[2], :]
            filename = os.path.join(output_dir, f'{image_name}_{str(slot_nmr).zfill(8)}.jpg')
            cv2.imwrite(filename, roi)
            
            # Append slot data
            slot_data.append({
                'filename': filename,
                'coordinate': {
                    'x1': str(slot[0]),
                    'y1': str(slot[1]),
                    'w': str(slot[2]),
                    'h': str(slot[3])
                },
                'prediction': None  # Placeholder for prediction
            })
        
        message = {
            'file_name': image_name,
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
    if len(sys.argv) != 2:
        error_message = "Usage: python3 crop.py <full_image_path>"
        logger.error(error_message)
        sys.exit(1)
    
    image_path = sys.argv[1]
    process_image(image_path)
