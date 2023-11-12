
def create_slot(cropped_filename,coordinate,lot_name,avg):
    x1, y1, w, h = coordinate 
    return {
        'filename': cropped_filename,
        'coordinate': {
            'x1': str(x1),
            'y1': str(y1),
            'w': str(w),
            'h': str(h)
        },
        'lot_name': lot_name,  # Assign the category name
        'hash_value': avg    # Store the hash value
    }
def compute_average_intensity(roi):
    # Calculate the average value
    avg = roi.mean()
    return avg     

def create_cropped_file_name(img_name,index):
    return f'{img_name}_{str(index).zfill(8)}.jpg'