import sys
import json
import os
from PIL import Image  
import torch
from torchvision import transforms
import torch.nn.functional as F

sys.path.append('/data/data/com.termux/files/home/project-root-directory/cpps-server/src/')
from logger.logger import setup_logger

logger = setup_logger("pytorch_model") 

# Define transforms
data_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])  
])

# Set the device to CPU
device = torch.device("cpu")

#Load model
model = torch.load("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/my_NETMODELV3_IMAGENET1K_V1_balanced.pth",map_location=torch.device('cpu'))
# Move model to CPU
model = model.to(device)  
model.eval()

class_names = open("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/labels.txt", "r").readlines()

def predict_occupancy(image_path):

    try:
        # Load image
        image = Image.open(image_path).convert('RGB')

        # Transform image 
        input_tensor = data_transforms(image)

        # Add batch dim
        input_tensor = input_tensor.unsqueeze(0)

        # Move to device
        input_tensor = input_tensor.to(device)

        # Forward pass 
        output = model(input_tensor)

        # Get prediction
        # Apply softmax to get probabilities
        probabilities = F.softmax(output, dim=1)

        # Find the class with the maximum probability
        _, prediction = torch.max(probabilities, 1)

        # Get the maximum probability (confidence score)
        confidence_score = torch.max(probabilities, dim=1).values.item()

        # Get the class index and class name
        index = prediction.item()


        class_name = class_names[index].strip()[2:]
        return class_name, confidence_score

    except Exception as e:
        error_message = f"Error predicting occupancy for {image_path}: {str(e)}"
        logger.error(error_message)
        exit(1)

def main():
    try:
        input_message = json.loads(sys.argv[1])
        slots = input_message['slots']

        for slot in slots:
            filename = slot['filename']
            class_name, confidence_score = predict_occupancy(filename)
            slot['prediction'] = {
                'class': class_name,
                'confidence': confidence_score
            }

        logger.info(f"MobileNet_V3_large predicted : {json.dumps(input_message)}")
        print(json.dumps(input_message))
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
