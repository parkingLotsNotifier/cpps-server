import os
import numpy as np
import 
import socket
from keras.models import load_model
from PIL import Image, ImageOps

# Define the path to the source directory
SOURCE_DIRECTORY = "/data/data/com.termux/files/home/photos/cropped"

# Define the log file
LOG_FILE = '/data/data/com.termux/files/home/project-root-directory/cpps-server/logs/predict.log'

# Define the path to the FIFO
FIFO_PATH = '/data/data/com.termux/files/home/project-root-directory/cpps-server/logs/crop_fifo'

# Configure logging
logging.basicConfig(filename=LOG_FILE, level=logging.INFO)

# Load the trained machine learning model
model = load_model("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/keras_model.h5", compile=False)

# Load the labels
class_names = open("/data/data/com.termux/files/home/project-root-directory/cpps-server/src/predict/model-and-label/labels.txt", "r").readlines()

def send_data_to_server(data):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect(('localhost', 3000))  # Replace 'localhost' and 12345 with your server's IP and port
        s.sendall(data.encode('utf-8'))
        s.close()
def write_to_fifo(message):
    with open(FIFO_PATH, 'w') as fifo:
        fifo.write(message)

# Function to predict parking occupancy for a single image
def predict_occupancy(image_path):
    try:
        # Load and preprocess the image
        image = Image.open(image_path).convert("RGB")
        size = (224, 224)
        image = ImageOps.fit(image, size, Image.LANCZOS)
        image_array = np.asarray(image)
        normalized_image_array = (image_array.astype(np.float32) / 127.5) - 1
        data = np.ndarray(shape=(1, 224, 224, 3), dtype=np.float32)
        data[0] = normalized_image_array
        # Make a prediction
        prediction = model.predict(data,verbose = 0)
        index = np.argmax(prediction)
        class_name = class_names[index]
        confidence_score = prediction[0][index]

        # Extract the parking name from the end of the image file (e.g., "some_image_parkingName.jpg")
        parking_name = os.path.basename(image_path).split("_")[-1].replace(".jpg", "")

        # Determine if the parking spot is occupied or unoccupied based on the class name
        occupancy = "Occupied" if "occupied" in class_name.lower() else "Unoccupied"

        logging.info(f"{parking_name}: {occupancy} (Confidence: {confidence_score:.2f})")
        return parking_name, occupancy, confidence_score
    except Exception as e:
        error_message = f"Error predicting occupancy for {image_path}: {str(e)}"
        logging.error(error_message)
        write_to_fifo(error_message)
        exit(1)

def main():
    try:
        # List all the image files in the source directory and sort them by name
        image_files = [os.path.join(SOURCE_DIRECTORY, file) for file in os.listdir(SOURCE_DIRECTORY) if file.endswith(".jpg")]
        image_files.sort()  # Sort the files by name

        results = []
        for image_path in image_files:
            parking_name, occupancy, confidence = predict_occupancy(image_path)
            result = f"{parking_name}: {occupancy} (Confidence: {confidence:.2f})"
            results.append(result)

        # Print the results (so they can be captured by Node.js)
        send_data_to_server(results)
        exit(0)
    except Exception as e:
        error_message = f"Error in main: {str(e)}"
        logging.error(error_message)
        write_to_fifo(error_message)
        send_data_to_server(error_message)  # Optionally send error messages to the server as well

if __name__ == "__main__":
    main()