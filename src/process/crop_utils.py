
# Convert x1, y1, w, and h to integers
def convert_coordinate_float_to_int(coordinates):
       return int(coordinates[0]), int(coordinates[1]), int(coordinates[2]), int(coordinates[3])

def crop(image,coordinate):
    x1, y1, w, h = coordinate 
    return image[y1:y1 + h, x1:x1 + w, :]

  

