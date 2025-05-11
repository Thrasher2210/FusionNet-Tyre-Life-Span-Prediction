import os
import logging
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify
from PIL import Image
import io
import joblib
import pickle
import traceback
from flask_cors import CORS

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# File paths for models
MODEL_PATHS = {
    'cnn': 'models/tire_classifier.h5',
    'road_encoder': 'models/road_label_encoder.pkl',
    'ensemble_weights': 'models/ensemble_weights.pkl',
    'rf_model': 'models/rf_model.pkl',
    'gb_model': 'models/gb_model.pkl'
}

def check_model_files():
    """Verify all required model files exist"""
    missing_files = [name for name, path in MODEL_PATHS.items() if not os.path.exists(path)]
    if missing_files:
        logger.error(f"Missing required model files: {', '.join(missing_files)}")
        raise FileNotFoundError(f"Missing model files: {', '.join(missing_files)}")

# Check files before proceeding
check_model_files()

def load_models():
    """Load and validate all required models"""
    models = {}
    try:
        # Load CNN model
        logger.info("Loading image analysis model...")
        models['cnn'] = tf.keras.models.load_model(MODEL_PATHS['cnn'])
        logger.info("Image analysis model loaded")

        # Load road condition encoder
        logger.info("Loading road condition encoder...")
        models['road_encoder'] = joblib.load(MODEL_PATHS['road_encoder'])
        road_classes = models['road_encoder'].classes_
        models['road_mapping'] = {str(cond).lower(): idx for idx, cond in enumerate(road_classes)}
        logger.info(f"Road conditions loaded: {', '.join(road_classes)}")

        # Load ensemble models and weights
        logger.info("Loading prediction models...")
        models['rf_model'] = joblib.load(MODEL_PATHS['rf_model'])
        models['gb_model'] = joblib.load(MODEL_PATHS['gb_model'])
        with open(MODEL_PATHS['ensemble_weights'], 'rb') as f:
            weights = pickle.load(f)
        models['rf_weight'] = weights['rf_weight']
        models['gb_weight'] = weights['gb_weight']
        logger.info("Prediction models loaded")
        
        return models
    except Exception as e:
        logger.error(f"Model loading failed: {traceback.format_exc()}")
        raise Exception(f"Model loading failed: {str(e)}")

# Load models at startup
models = load_models()

def preprocess_image(image_bytes):
    """Prepare uploaded image for CNN classification"""
    try:
        if not image_bytes:
            raise ValueError("No image data provided")
        
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')
        image = image.resize((224, 224))
        image_array = np.array(image) / 255.0
        
        if image_array.shape[-1] == 1:
            image_array = np.repeat(image_array, 3, axis=-1)
        elif image_array.shape[-1] == 4:
            image_array = image_array[:, :, :3]
            
        if image_array.shape != (224, 224, 3):
            raise ValueError(f"Invalid image shape: {image_array.shape}")
            
        return np.expand_dims(image_array, axis=0)
    except Exception as e:
        logger.error(f"Image processing failed: {traceback.format_exc()}")
        raise Exception(f"Image processing error: {str(e)}")

def predict_lifespan(image_tensor, params):
    """Generate lifespan prediction from inputs"""
    try:
        # Validate image tensor
        if image_tensor is None:
            raise ValueError("Invalid image tensor")

        # Classify image
        cnn_pred = models['cnn'].predict(image_tensor, verbose=0)
        condition = 1 if cnn_pred[0][0] > 0.5 else 0
        classification = 'Good' if condition == 1 else 'Defective'

        # Encode road condition
        road_encoded = models['road_mapping'].get(params['road_condition'].lower())
        if road_encoded is None:
            valid = list(models['road_mapping'].keys())
            raise ValueError(f"Invalid road condition. Valid options: {valid}")

        # Prepare input features
        input_data = np.array([[
            params['pressure'],
            params['load'],
            params['tkph'],
            params['temp'],
            params['speed'],
            condition,
            road_encoded
        ]])

        # Predict using ensemble
        rf_pred = models['rf_model'].predict(input_data)[0]
        gb_pred = models['gb_model'].predict(input_data)[0]
        lifespan = models['rf_weight'] * rf_pred + models['gb_weight'] * gb_pred

        # Apply penalty for defective tires
        if condition == 0:
            lifespan *= 0.7

        # Apply bounds (in km)
        lifespan = max(5000, min(150000, float(lifespan)))

        # Debug info
        debug_info = {
            'cnn_probability': float(cnn_pred[0][0]),
            'condition': condition,
            'classification': classification,
            'rf_pred': rf_pred,
            'gb_pred': gb_pred,
            'rf_weight': models['rf_weight'],
            'gb_weight': models['gb_weight'],
            'lifespan_before_penalty': models['rf_weight'] * rf_pred + models['gb_weight'] * gb_pred,
            'lifespan_after_penalty': lifespan
        }
        
        return lifespan, classification, debug_info
    except Exception as e:
        logger.error(f"Prediction failed: {traceback.format_exc()}")
        raise Exception(f"Prediction error: {str(e)}")

@app.route('/api/predict', methods=['POST'])
def predict():
    """API endpoint for tire lifespan prediction"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        image_file = request.files['image']
        image_bytes = image_file.read()
        image_tensor = preprocess_image(image_bytes)
        if image_tensor is None:
            return jsonify({'error': 'Image processing failed'}), 400

        # Get form data
        params = {
            'pressure': float(request.form.get('pressure', 32.0)),
            'load': float(request.form.get('load', 1500.0)),
            'tkph': float(request.form.get('tkph', 150.0)),
            'temp': float(request.form.get('temp', 25.0)),
            'speed': float(request.form.get('speed', 60.0)),
            'road_condition': request.form.get('road_condition', 'paved')
        }

        # Make prediction
        lifespan, classification, debug_info = predict_lifespan(image_tensor, params)
        if lifespan is None:
            return jsonify({'error': 'Prediction failed'}), 500

        # Prepare response
        km = round(lifespan)
        miles = round(km * 0.621371)
        response = {
            'lifespan_km': km,
            'lifespan_miles': miles,
            'classification': classification,
            'debug_info': debug_info if request.form.get('debug_mode', 'false').lower() == 'true' else None
        }

        return jsonify(response), 200
    except Exception as e:
        logger.error(f"API error: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/road_conditions', methods=['GET'])
def get_road_conditions():
    """Return available road conditions"""
    try:
        road_conditions = sorted(models['road_mapping'].keys())
        return jsonify({'road_conditions': road_conditions}), 200
    except Exception as e:
        logger.error(f"Error fetching road conditions: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)