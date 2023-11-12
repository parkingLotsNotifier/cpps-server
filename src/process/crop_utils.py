
# Convert x1, y1, w, and h to integers
def convert_coordinate_float_to_int(x1, y1, w, h):
    return int(x1), int(y1), int(w), int(h)

def crop(image,coordinate):
    x1, y1, w, h = coordinate 
    return image[y1:y1 + h, x1:x1 + w, :]

  

