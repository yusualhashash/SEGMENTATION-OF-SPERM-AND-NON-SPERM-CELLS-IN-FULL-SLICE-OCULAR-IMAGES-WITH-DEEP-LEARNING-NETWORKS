import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Image, Alert, ActivityIndicator, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ImageZoom from 'react-native-image-pan-zoom';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Modal } from 'react-native';
import { Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';




const App = () => {
  const [patientOption, setPatientOption] = useState(null);
  const [folderName, setFolderName] = useState('');
  const [folders, setFolders] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveImageOption, setSaveImageOption] = useState(false);
  const [showSaveOption, setShowSaveOption] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [patientSubFolders, setPatientSubFolders] = useState([]);
  const [folderImages, setFolderImages] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isZoomEnabled, setIsZoomEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState('model1');
  const SERVER_URL = 'http://192.168.223.176:5000';





  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Please enable media library access in your device settings to use this feature.');
      }
    })();
  }, []);

  const openImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 1,
    });

    if (!result.canceled) {
        setSelectedImage(result.uri);
        setProcessedImage(null);
        setSaveImageOption(false);
    }
  };

  const handleCameraLaunch = async () => {
    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 1,
    });

    if (!result.canceled) {
        setSelectedImage(result.uri);
        setProcessedImage(null);
        setSaveImageOption(false);
    }
  };

  const sendPhotoToServer = async () => {
    try {
      if (selectedImage && folderName) {
        const formData = new FormData();
        formData.append('file', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'Original_Photo.jpg',
        });
        formData.append('folder_name', folderName);
        formData.append('model_choice', selectedModel);
        setIsLoading(true);
        const response = await fetch(`${SERVER_URL}/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });
  
        const responseJson = await response.json();
        if (response.status >= 200 && response.status < 300) {
          setProcessedImage(`data:image/jpeg;base64,${responseJson.processed_image}`);
          setSaveImageOption(true);
          setShowSaveOption(true);
        } else {
          Alert.alert('Error', `Failed to send photo to the server: ${responseJson.message}`);
        }
      } else {
        Alert.alert('Warning', 'Please select an image and a folder before sending to the server.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send photo to the server.');
    } finally {
      setIsLoading(false);
    }
  };
  


  
  const handleFolderSubmit = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${SERVER_URL}/create_folder`, { folder_name: folderName });
      setCurrentPatient(folderName);
      setPatientOption('image');
      setSelectedImage(null); // Reset the selected image
      setProcessedImage(null); // Reset the processed image
      Alert.alert('Success', 'Folder created successfully. Now you can select or take a photo.');
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder');
    } finally {
      setIsLoading(false);
    }
  };
  



  
  const handleFolderSelect = async (patient) => {
    setCurrentPatient(patient);
    setFolderName(patient); 
    setSelectedImage(null); // Reset the selected image
    setIsOptionsModalVisible(true);
  };



  
const handleFolderImageFetch = async (folder) => {
  setIsLoading(true);
  try {
    const response = await axios.get(`${SERVER_URL}/get_images/${currentPatient}/${folder}`);
      if (response.status === 200 && response.data.length > 0) {
          setFolderImages(response.data);
          setPatientOption('viewImages');
      } else {
          Alert.alert('No Images', 'There are no images in this folder.');
      }
  } catch (error) {
      Alert.alert('Error', `Failed to fetch images: ${error.message}`);
  } finally {
      setIsLoading(false);
  }
};

  
  

  const fetchFolders = async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/list_folders`);
      setFolders(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch folders');
    }
  };

  useEffect(() => {
    if (patientOption === 'old') {
      fetchFolders();
    }
  }, [patientOption]);





  const goBack = () => {
    let nextState = null;
  
    if (patientOption === 'image') {
      nextState = 'old';
    } else if (patientOption === 'viewImages') {
      nextState = 'patientDetails';
      setFolderImages([]); // Clear the images
    } else if (patientOption === 'patientDetails') {
      nextState = 'old';
    } else {
      nextState = null; // Main page
      setFolderName('');
    }
  
    if (nextState !== patientOption) {
      // Add current state to navigation history before changing state
      setNavigationHistory([...navigationHistory, patientOption]);
    }
    setPatientOption(nextState);
  };
  
  
  
  


  


  const goForward = () => {
    if (navigationHistory.length > 0) {
      const lastState = navigationHistory[navigationHistory.length - 1];
      // Check if the last state is not 'image'
      if (lastState !== 'image') {
        setPatientOption(lastState);
        // Additional logic for specific states (if needed)
        if (lastState === 'viewImages') {
          setFolderImages([]);
        }
        // Update the navigation history
        setNavigationHistory(navigationHistory.slice(0, -1));
      }
    }
  };
  
  
  




  const fetchPatientFolders = async (patient) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/list_subfolders/${patient}`);
     
      setPatientSubFolders(response.data);
    } catch (error) {
      console.error("Error fetching patient folders:", error);
      Alert.alert('Error', 'Failed to fetch patient folders');
    } finally {
      setIsLoading(false);
    }
  };
  
  




  const fetchImagesForFolder = async (parentFolder, folderName) => {
    setIsLoading(true);
    try {
        const url = `${SERVER_URL}/get_images/${parentFolder}/${folderName}`;
        const response = await axios.get(url);
        if (response.status === 200) {
            if (response.data.length === 0) {
                // If the folder is empty, show an alert
                Alert.alert('Empty Folder', 'There are no images in this folder.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            
                        },
                    },
                ]);
            } else {
                // Set the images in non-empty folders
                setFolderImages(response.data);
            }
        } else {
            Alert.alert('Error', `Failed to fetch images: ${response.statusText}`);
        }
    } catch (error) {
        console.error("Error fetching images:", error);
        Alert.alert('Error', `Failed to fetch images: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
};




  
const renderImages = () => {
  const imageDimensionhight = 400; // Set the width and height for the image
  const imageDimensionwidth =360;
  const imageDimensionhightt = 540; // Set the width and height for the image
  const imageDimensionwidthh =360;
  return (
    <View style={styles.imageListContainer}>
      {folderImages.map((base64Image, index) => (
        <ImageZoom
          key={index}
          cropWidth={imageDimensionwidth}
          cropHeight={imageDimensionhight}
          imageWidth={imageDimensionwidthh}
          imageHeight={imageDimensionhightt}
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
            style={styles.imageThumbnail}
          />
        </ImageZoom>
      ))}
    </View>
  );
};









const OptionsModal = () => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isOptionsModalVisible}
    onRequestClose={() => {
      setIsOptionsModalVisible(!isOptionsModalVisible);
    }}
  >
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <TouchableOpacity
          style={[styles.buttonoption, styles.buttonClose]}
          onPress={() => {
            fetchPatientFolders(currentPatient);
            setPatientOption('patientDetails');
            setIsOptionsModalVisible(false);
          }}
        >
          <Text style={styles.textStyle}>Display All Folders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonoption, styles.buttonClose]}
          onPress={() => {
            setPatientOption('image');
            setIsOptionsModalVisible(false);
            setSelectedImage(null); // Reset the selected image
            setProcessedImage(null); // Reset the processed image
          }}
        >
          <Text style={styles.textStyle}>Select/Take Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  

  

  return (
    <View style={styles.container}>
      {!patientOption && (
        <View>
          <TouchableOpacity style={styles.mainbutton} onPress={() => setPatientOption('new')}>
            <Text>New Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mainbutton} onPress={() => setPatientOption('old')}>
            <Text>Old Patient</Text>
          </TouchableOpacity>
        </View>
      )}
      { patientOption === 'new' && (
        <View>
          <TextInput
            value={folderName}
            onChangeText={setFolderName}
            placeholder="Enter Patient Name"
            style={styles.input}
          />
          <TouchableOpacity style={styles.Submitbutton} onPress={handleFolderSubmit}>
            <Text>Submit</Text>
          </TouchableOpacity>
        </View>
      )}


{folderImages.length > 0 && renderImages()}  



{patientOption === 'old' && (
      <View style={styles.listContainer}>
        <Text style={styles.subFolderTitle}>List of Patients:</Text>
        <FlatList
          data={folders}
          keyExtractor={(item, index) => 'key' + index}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.sendButton} onPress={() => handleFolderSelect(item)}>
              <Text>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )}


{patientOption === 'patientDetails' && (
  <View style={styles.listContainer}>
    <Text style={styles.subFolderTitle}>Folders of Patient: {currentPatient}</Text>
    <FlatList
      data={patientSubFolders}
      keyExtractor={(item, index) => 'subfolder-' + index}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.sendButton} onPress={() => handleFolderImageFetch(item)}>
          <Text style={styles.folderText}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  </View>
)}


      {/* Image Viewer Modal */}
      <Modal
        visible={isImageViewerVisible}
        transparent={true}
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer} 
          activeOpacity={1} 
          onPressOut={() => setIsImageViewerVisible(false)}
        >
          <Image source={{ uri: currentImage }} style={styles.fullSizeImage} />
        </TouchableOpacity>
      </Modal>



      {patientOption === 'image' && (
        <View>
          <Text style={{ position: 'absolute', fontSize: 16, right: 20, top: -50, color: 'red' }}>{currentPatient}</Text>
            <View style={styles.card}>
                {processedImage ? (
                  <ImageZoom
                    cropWidth={Dimensions.get('window').width * 0.95}
                    cropHeight={350}
                    imageWidth={Dimensions.get('window').width * 0.95}
                    imageHeight={350}
                    centerOn={{ x: 0, y: 0, scale: 1 }}
                  >
                    <Image
                      source={{ uri: processedImage }}
                      style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                    />
                  </ImageZoom>
                ) : selectedImage ? (
                  <ImageZoom
                    cropWidth={Dimensions.get('window').width * 0.95}
                    cropHeight={350}
                    imageWidth={Dimensions.get('window').width * 0.95}
                    imageHeight={350}
                    centerOn={{ x: 0, y: 0, scale: 1 }}
                  >
                    <Image
                      source={{ uri: selectedImage }}
                      style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                    />
                  </ImageZoom>
                ) : (
                  <TouchableOpacity style={styles.cameraIconContainer} onPress={handleCameraLaunch}>
                    <MaterialCommunityIcons name="camera" size={100} color="#2e2e2e" />
                  </TouchableOpacity>
                )}
              </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.buttondev} onPress={openImagePicker}>
              <MaterialCommunityIcons name="image" size={24} color="white" />
              <Text style={styles.buttonText}>Choose from Device</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonCamera} onPress={handleCameraLaunch}>
              <MaterialCommunityIcons name="camera" size={24} color="white" />
              <Text style={styles.buttonText}>Open Camera</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sendButtonContainer}>
            <TouchableOpacity style={styles.sendserverButton} onPress={sendPhotoToServer}>
              <MaterialCommunityIcons name="send" size={24} color="white" />
              <Text style={styles.buttonText}>Send to Server</Text>
            </TouchableOpacity>
          </View>

          {isLoading && <ActivityIndicator  size="large" color="#5a9bd5" />}
        </View>
      )}


    {(patientOption === null ||  patientOption === 'old' || patientOption === 'patientDetails' ) ? ( 
      <Image
        source={require('./assets/ytu_logo.png')} 
        style={styles.logo}
      />
    ) : null}

    

{(  patientOption === 'image') ? (
    <View style={{  top:30, }}>
      <Text style={{ color: 'white', marginBottom: 5 }}></Text>
      <Picker
        selectedValue={selectedModel}
        style={{ height: 50, width: 250, color: 'white' , backgroundColor: 'red'}}
        onValueChange={(itemValue, itemIndex) => setSelectedModel(itemValue)}>
        <Picker.Item label="Model of 1 Class" value="model1" />
        <Picker.Item label="Model of 18 Class" value="model2" />
      </Picker>
    </View> 

    ) : null}




    {(patientOption === null || patientOption === 'old') ? (
      <TouchableOpacity style={styles.forwardButton} onPress={goForward}>
        <MaterialCommunityIcons name="arrow-right" size={24} color="white" />
      </TouchableOpacity>
    ) : null}
  
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <OptionsModal />
    </View>
  );
};

const styles = StyleSheet.create({

  imageListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',   
    flexDirection: 'row',   
    flexWrap: 'wrap',        
},
imageThumbnail: {
  top:75,
  width: 350,
  height: 390,
  margin: 5,
},


modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
fullSizeImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },



  imageListContainer: {
    flex: 1,
    padding: 10,
  },
  image: {
    width: 100,
    height: 100,
    margin: 5,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    position: 'relative',
  },

  listContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 90, 
    paddingBottom:30,
  },


  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    width: '95%',
    height: 350, 
    aspectRatio: 1, 
    top: 20,
    margin: 10,
    justifyContent: 'center', 
    alignItems: 'center',     
  },


  image: {
    width: '110%', 
    height: '110%', 
    resizeMode: 'contain', 
  },
  

  cameraIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },

  
  buttondev: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a9bd5',
    padding: 15,
    borderRadius: 10,
    top:15,
    left:30,
  },
  buttonCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a9bd5',
    padding: 15,
    borderRadius: 10,
    top:15,
    left:30,
  },

  sendButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },


  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a9bd5',
    padding: 15,
    margin :5,
    borderRadius: 10,
  },



  
  forwardButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    backgroundColor: '#5a9bd5',
    padding: 10,
    borderRadius: 20,
  },



  backButton: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: '#5a9bd5',
    padding: 10,
    borderRadius: 20,
  },



  mainbutton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', 
    backgroundColor: '#5a9bd5',
    paddingVertical: 20, 
    paddingHorizontal: 30, 
    margin: 10, 
    borderRadius: 15, 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    
},



Submitbutton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center', 
  backgroundColor: '#5a9bd5',
  paddingVertical: 12, 
  paddingHorizontal: 10, 
  margin: 10, 
  borderRadius: 10, 
  elevation: 5, 
  shadowColor: '#000', 
  shadowOffset: { width: 0, height: 2 }, 
  shadowOpacity: 0.3, 
  shadowRadius: 4, 
  
},


  sendserverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5a9bd5',
    padding: 15,
    margin :5,
    borderRadius: 10,
  },

  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 11,
  },




  
  input: {
    height: 45,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 20,
    padding: 11,
    width: 250,
  },


  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },


  logo: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    top: 40,
    zIndex: 1,
    width: 50,
    height: 50,
  },

  subFolderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  





  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },


  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",

    shadowOffset: {
      width: 1,
      height: 2
    },

    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },

  buttonoption: {
    borderRadius: 15,
    padding: 10,
    elevation: 5,
    marginVertical: 10
  },


  buttonClose: {
    backgroundColor: "#2196F3",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center"
  },



});

export default App;
