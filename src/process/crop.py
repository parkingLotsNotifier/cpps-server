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
        blueprint_json_path = '/data/data/com.termux/files/home/project-root-directory/cpps-server/src/process/blueprint.json'
        

        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        with open(blueprint_json_path, 'r') as json_file:
            data = json.load(json_file)

        slots = []
        for obj in data['annotations']:
            x1, y1, w, h = obj['bbox']
            category_id = obj['category_id']
            slots.append([x1, y1, w, h, category_id])

        image_name = os.path.splitext(os.path.basename(image_path))
        image_name = str(image_name[0] + image_name[1])
        image = cv2.imread(image_path + '.jpg')

        slot_data = []
        for slot_nmr, slot in enumerate(slots):
            x1, y1, w, h, category_id = slot
            
             # Convert x1, y1, w, and h to integers
            x1, y1, w, h = int(x1), int(y1), int(w), int(h)
            
            roi = image[y1:y1 + h, x1:x1 + w, :]
            filename = os.path.join(output_dir, f'{image_name}_{str(slot_nmr).zfill(8)}.jpg')
            cv2.imwrite(filename, roi)

            # Get the category name based on category_id
            category_name = next((cat['name'] for cat in data['categories'] if cat['id'] == category_id), None)

            # Append slot data
            slot_data.append({
                'filename': filename,
                'coordinate': {
                    'x1': str(x1),
                    'y1': str(y1),
                    'w': str(w),
                    'h': str(h)
                },
                'lot_name': category_name  # Assign the category name
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
        error_message = "Usage: python3 crop.py <full_image_path> "
        logger.error(error_message)
        sys.exit(1)

    image_path = sys.argv[1]
    process_image(image_path)