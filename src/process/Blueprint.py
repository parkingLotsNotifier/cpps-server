import json

class Blueprint:

    def __init__(self):
        self.__blueprint_data = None


    def parse_blueprint_and_save_data(self,json_file_path):
        with open(json_file_path, 'r') as file:
            self.__blueprint_data = json.load(file)

    def get_blueprint_data(self):
             return self.__blueprint_data 

    
    '''
    
    this is the basic info that can be load from blueprint
    data maniputation methods are on UtilsBasicData.py

    '''
    
        
    