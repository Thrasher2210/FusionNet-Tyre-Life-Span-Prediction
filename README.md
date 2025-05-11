# tyre Lifespan Predictor

The **tyre Lifespan Predictor** is a web application that predicts the expected lifespan of tyres based on image analysis and operational parameters. It uses a machine learning backend powered by Flask and TensorFlow, and a React-based frontend for user interaction.

---

## Features

- Upload tyre images for analysis.
- Input operational parameters such as pressure, load, speed, and road conditions.
- Predict tyre lifespan in kilometers and miles.
- View maintenance suggestions based on predicted lifespan.
- Debug mode for detailed prediction insights.

---

## Installation

### Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up the environment variables:
   ```bash
   export FLASK_APP=app.py
   export FLASK_ENV=development
   ```
4. Run the Flask application:
   ```bash
   flask run
   ```

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```
3. Start the React development server:
   ```bash
   npm start
   ```

---

## Usage

1. Open the web application in your browser (usually at `http://localhost:3000`).
2. Upload tyre images using the image upload feature.
3. Enter the operational parameters in the provided fields.
4. Click on the "Predict Lifespan" button to get the tyre lifespan prediction.
5. View the maintenance suggestions and debug information (if enabled).

---

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/my-feature
   ```
3. Make the necessary changes and commit them:
   ```bash
   git commit -m "Add my feature"
   ```
4. Push the changes to your forked repository:
   ```bash
   git push origin feature/my-feature
   ```
5. Create a pull request describing your changes.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Flask](https://flask.palletsprojects.com/) - The web framework used for the backend.
- [TensorFlow](https://www.tensorflow.org/) - The machine learning framework used for model training and inference.
- [React](https://reactjs.org/) - The JavaScript library used for building the user interface.
- [Node.js](https://nodejs.org/) - The JavaScript runtime used for the frontend development server.
