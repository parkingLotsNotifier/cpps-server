from Blueprint import Blueprint
from glom import glom 

class UtilsBlueprintBasicData:

    def __init__(self,blueprint,list_of_root_attr):
        self.__dict_blueprint_data = blueprint
        self.__list_of_root_attrs = list_of_root_attr
        self.__dict_basic_data = None
        self.__list_final_basic_data = []

    def import_attr_from_blueprint_data(self):
        result = {}
        try:
            for attr in self.__list_of_root_attrs:
                result[attr] = self.__dict_blueprint_data.get(attr)
            self.__dict_basic_data=result
        except (KeyError, TypeError) as error:
            raise error
            
    
    
    #this method  orchestrates the inner data processing workflow
    def process_inner_data_dict_basic_data(self):
        try: 
            categories = self.extract_categories()
            annotations = self.extract_annotations()
            bbox_mapping = self.map_category_id_to_bbox(annotations)
            self.aggregate_information(categories, bbox_mapping)
        except Exception as error:
              raise error  

    def extract_categories(self):
      try:  
        spec_categories = ('categories', [{'id': 'id', 'name': 'name'}])
              #glom(target,spec)
        return glom(self.__dict_basic_data, spec_categories)
      except GlomError as error:
            raise error
    
    def extract_annotations(self):
        try: 
            spec_annotations = ('annotations', [{'category_id': 'category_id', 'bbox': 'bbox'}])
                  #glom(target,spec)
            return glom(self.__dict_basic_data, spec_annotations)
        except GlomError as error:
            raise error
        
    #staticmethod since it doesn't rely on any instance variables.
    @staticmethod
    def map_category_id_to_bbox(annotations):
        return {ann['category_id']: ann['bbox'] for ann in annotations}

    def aggregate_information(self,categories, bbox_mapping):
       try:
            '''
            iterates over each category in the categories list, 
            extracts the category ID and name, 
            and then uses the category ID to retrieve the corresponding bounding box from the 
            bbox_mapping dictionary.
            '''
     
            for category in categories:
                cat_id = category['id']
                cat_name = category['name']
                
                #uses the category ID to retrieve the corresponding bounding box from the bbox_mapping dictionary
                bbox = bbox_mapping.get(cat_id)

                self.__list_final_basic_data.append({'lot_name': cat_name, 'bbox': bbox})
        
       except (KeyError, TypeError) as error:
            raise error
        
    @property
    def list_final_basic_data(self):
        return self.__list_final_basic_data

    def get_lot_name(self,index):
        return self.__list_final_basic_data[index]['lot_name']

    def get_bbox(self,index):
        return self.__list_final_basic_data[index]['bbox']    

    

