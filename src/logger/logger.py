# logger.py

import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler
import os

def setup_logger(service_name):
    # Create log file name based on service name and date
    log_file = f"{service_name}-{datetime.now().strftime('%Y-%m-%d')}.log"
    fifo_file = f"{service_name}-{datetime.now().strftime('%Y-%m-%d')}.fifo"

    # Check if FIFO exists, if not, create it
    if not os.path.exists(fifo_file):
        os.mkfifo(fifo_file)

    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    # Set up rotating file handler for log file
    file_handler = RotatingFileHandler(f"/data/data/com.termux/files/home/project-root-directory/cpps-server/logs/{log_file}", maxBytes=5*1024*1024, backupCount=3)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Set up handler for FIFO
    fifo_handler = logging.StreamHandler(open(f"/data/data/com.termux/files/home/project-root-directory/cpps-server/logs/{fifo_file}", 'w'))
    fifo_handler.setLevel(logging.ERROR)  # Only log errors to FIFO
    fifo_handler.setFormatter(formatter)
    logger.addHandler(fifo_handler)

    return logger

# Usage in another script:
# from logger import setup_logger
# logger = setup_logger("my_service")
# logger.info("This is an info message.")
# logger.error("This is an error message.")