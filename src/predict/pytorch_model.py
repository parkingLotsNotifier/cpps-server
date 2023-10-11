import sys
import json
import os
import numpy as np
import torch
import torch.nn.functional as F
import cv2
sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger

logger = setup_logger("pytorch_model") 

SOURCE_DIRECTORY = "/data/data/com.termux/files/home/photos/cropped"
model = torch.load("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/my_mobilenet_v3_large.pth",map_location=torch.device('cpu'))
model.eval()

class_names = open("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/labels.txt", "r").readlines()


def predict_occupancy(image_path):
    try:
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        size = (224, 224)
        image = cv2.resize(image, size)

        # Normalize the image to the range [-1, 1]
        normalized_image_array = (image.astype(np.float32) / 127.5) - 1

        # Change the dimensions and order
        data = np.transpose(normalized_image_array, (2, 0, 1))
        data = np.expand_dims(data, 0)
        data = torch.tensor(data)

        # Predict using the model
        prediction = model(data)
        
        # Apply softmax to get probabilities
        probabilities = F.softmax(prediction, dim=1)
        index = torch.argmax(probabilities).item()
        confidence_score = torch.max(probabilities, dim=1).values.item()

        class_name = class_names[index].strip()

        parking_name = os.path.basename(image_path).split("_")[-1].replace(".jpg", "")
        result = f"{parking_name}: {class_name} (Confidence: {confidence_score:.2f})"
        return result

    except Exception as e:
        error_message = f"Error predicting occupancy for {image_path}: {str(e)}"
        logger.error(error_message)
        exit(1)

def main():
    try:
        image_files = [os.path.join(SOURCE_DIRECTORY, file) for file in os.listdir(SOURCE_DIRECTORY) if file.endswith(".jpg")]
        image_files.sort()
        
        results = [predict_occupancy(image_path) for image_path in image_files]
        logger.info(f"MobileNet_V3_large predicted : {results}")
        message = {
            'predictions': results
        }
        
        # Send the results via IPC
        #os.write(3, json.dumps(results_data).encode('utf-8'))
        print(json.dumps(message))
        sys.stdout.flush()
        logger.info("MobileNet_V2 predicted and sent via IPC the results to startCPPS")
        sys.exit(0)
    except Exception as e:
        error_message = f"Error in main: {str(e)}"
        logger.error(error_message)
        message = {
            'error': str(e)
        }
        print(json.dumps(message))
        sys.stdout.flush()
        sys.exit(1)
       

if __name__ == "__main__":
    main()
