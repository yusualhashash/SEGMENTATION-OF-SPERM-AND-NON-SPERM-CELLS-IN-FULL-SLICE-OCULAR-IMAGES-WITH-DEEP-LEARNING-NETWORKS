from fileinput import filename
from flask import request, jsonify, Flask
import base64
import os
import logging
import re
from werkzeug.utils import secure_filename
from ultralytics import YOLO
from datetime import datetime
from shutil import move

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize both models
model1 = YOLO('best_model1.pt')
model2 = YOLO('best_model2.pt')
@app.route("/upload", methods=["POST"])
def upload_file():
    try:
        folder_name = request.form.get('folder_name')  # This is actually the patient's name
        model_choice = request.form.get('model_choice', 'model1')

        if not folder_name:
            return jsonify({"error": "Folder name is required"}), 400

        if 'file' not in request.files:
            raise Exception("No file part")
        file = request.files['file']
        if file.filename == '':
            raise Exception("No selected file")

        current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{folder_name}_{current_time}"

        patient_folder_path = os.path.join("patient_folders", folder_name)
        os.makedirs(patient_folder_path, exist_ok=True)
        upload_folder = os.path.join(patient_folder_path, current_time)
        os.makedirs(upload_folder, exist_ok=True)

        original_file_path = os.path.join(upload_folder, new_filename + os.path.splitext(file.filename)[1])
        file.save(original_file_path)
        
        if model_choice == 'model1':
            model = model1
        else:
            model = model2

        results = model.predict(original_file_path, save=True, imgsz=640, conf=0.12)

        predicted_labels_path = os.path.join(upload_folder, f"{new_filename}.txt")
        with open(predicted_labels_path, 'w') as prediction_file:
            for idx, prediction in enumerate(results[0].boxes.xywhn):
                cls = int(results[0].boxes.cls[idx].item())
                prediction_file.write(f"{cls} {prediction[0].item()} {prediction[1].item()} {prediction[2].item()} {prediction[3].item()}\n")

        # Find the latest YOLO output folder
        yolo_output_base_folder = os.path.join("runs", "detect")
        output_folders = [os.path.join(yolo_output_base_folder, f) for f in os.listdir(yolo_output_base_folder) if os.path.isdir(os.path.join(yolo_output_base_folder, f))]
        if output_folders:
            latest_output_folder = max(output_folders, key=os.path.getmtime)
            processed_image_folder = latest_output_folder
            processed_image_name = new_filename + os.path.splitext(file.filename)[1]  # Use the new filename
            processed_image_path = os.path.join(processed_image_folder, processed_image_name)
        else:
            logger.error("No YOLO output folder found.")
            return jsonify({"error": "Processing error: no output folder found"}), 500

        # Move the processed image to the timestamped subfolder
        new_processed_image_path = os.path.join(upload_folder, "processed_" + processed_image_name)
        move(processed_image_path, new_processed_image_path)

        with open(new_processed_image_path, "rb") as img_file:
            encoded_string = base64.b64encode(img_file.read()).decode('utf-8')

        return jsonify({"message": "File uploaded and processed successfully!", "processed_image": encoded_string})
    except Exception as e:
        logger.exception(f"Error: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

@app.route("/create_folder", methods=["POST"])
def create_folder():
    try:
        folder_name = request.json.get('folder_name')
        if not folder_name:
            return jsonify({"error": "Folder name is required"}), 400
        base_path = "patient_folders"
        os.makedirs(base_path, exist_ok=True)
        folder_path = os.path.join(base_path, folder_name)
        os.makedirs(folder_path, exist_ok=True)
        return jsonify({"message": "Folder created successfully"}), 200
    except Exception as e:
        logger.exception(f"Error creating folder: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

@app.route("/list_folders", methods=["GET"])
def list_folders():
    try:
        base_path = "patient_folders"
        if not os.path.exists(base_path):
            return jsonify({"message": "No folders found"})

        folders = [folder for folder in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, folder))]
        return jsonify(folders)
    except Exception as e:
        logger.exception(f"Error listing folders: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500


@app.route("/list_subfolders/<folder_name>", methods=["GET"])
def list_subfolders(folder_name):
    try:
        base_path = os.path.join("patient_folders", folder_name)
        if not os.path.exists(base_path):
            return jsonify({"error": "Folder not found"}), 404

        subfolders = [f for f in os.listdir(base_path) if os.path.isdir(os.path.join(base_path, f))]
        return jsonify(subfolders)
    except Exception as e:
        logger.exception(f"Error listing subfolders: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500




@app.route("/get_images/<parent_folder>/<folder_name>", methods=["GET"])
def get_images(parent_folder, folder_name):
    base_path = os.path.join("patient_folders", parent_folder, folder_name)
    logger.info(f"Attempting to access folder: {base_path}")

    if not os.path.exists(base_path):
        logger.error(f"Folder not found: {base_path}")
        return jsonify({"error": "Folder not found"}), 404

    image_files = [f for f in os.listdir(base_path) if os.path.isfile(os.path.join(base_path, f)) and f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    encoded_images = []
    for image_file in image_files:
        try:
            with open(os.path.join(base_path, image_file), "rb") as img_file:
                encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
                encoded_images.append(encoded_string)
        except Exception as e:
            logger.exception(f"Error processing image {image_file}: {str(e)}")
    
    return jsonify(encoded_images)



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
