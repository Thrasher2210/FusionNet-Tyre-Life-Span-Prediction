import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Sun, Moon, Upload, AlertCircle, AlertTriangle } from 'react-feather';

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [parameters, setParameters] = useState({
    pressure: 32.0,
    load: 1500.0,
    tkph: 150.0,
    temp: 25.0,
    speed: 60.0,
    road_condition: 'paved',
    debug_mode: false,
  });
  const [roadConditions, setRoadConditions] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('light');

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Fetch road conditions on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/road_conditions')
      .then(response => {
        setRoadConditions(response.data.road_conditions);
        setParameters(prev => ({
          ...prev,
          road_condition: response.data.road_conditions.includes('paved') ? 'paved' : response.data.road_conditions[0]
        }));
      })
      .catch(err => {
        setError('Failed to load road conditions');
        console.error(err);
      });
  }, []);

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle parameter changes
  const handleParameterChange = (name, value) => {
    setParameters(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) {
      setError('Please upload a tire image');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);
    Object.keys(parameters).forEach(key => {
      formData.append(key, parameters[key]);
    });

    try {
      const response = await axios.post('http://localhost:5000/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Prediction failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <h1>🚗 Tire Lifespan Predictor</h1>
      <p className="description">
        Predict the expected lifespan of tires based on image analysis and operational parameters.
      </p>

      <div className="grid">
        {/* Image Upload Section */}
        <div className="grid-column">
          <div className="card image-upload">
            <h2>📷 Tire Image Analysis</h2>
            <div className="image-upload-label">
              <Upload size={40} />
              <span>Click or drag to upload tire image</span>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <img src={imagePreview} alt="Uploaded Tire" className="image-preview" />
            )}
          </div>
        </div>

        {/* Parameters Section */}
        <div className="grid-column">
          <div className="card">
            <h2>⚙️ Operational Parameters</h2>
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label>Tire Pressure (PSI)</label>
                <input
                  type="range"
                  min="20"
                  max="15000"
                  step="0.1"
                  value={parameters.pressure}
                  onChange={(e) => handleParameterChange('pressure', parseFloat(e.target.value))}
                />
                <span>{parameters.pressure} PSI</span>
              </div>
              <div className="form-group">
                <label>External Load (lbs)</label>
                <input
                  type="range"
                  min="500"
                  max="15000"
                  step="10"
                  value={parameters.load}
                  onChange={(e) => handleParameterChange('load', parseFloat(e.target.value))}
                />
                <span>{parameters.load} lbs</span>
              </div>
              <div className="form-group">
                <label>TKPH Rating</label>
                <input
                  type="range"
                  min="50"
                  max="800"
                  step="5"
                  value={parameters.tkph}
                  onChange={(e) => handleParameterChange('tkph', parseFloat(e.target.value))}
                />
                <span>{parameters.tkph}</span>
              </div>
              <div className="form-group">
                <label>Ambient Temperature (°C)</label>
                <input
                  type="range"
                  min="-20"
                  max="80"
                  step="0.5"
                  value={parameters.temp}
                  onChange={(e) => handleParameterChange('temp', parseFloat(e.target.value))}
                />
                <span>{parameters.temp} °C</span>
              </div>
              <div className="form-group">
                <label>Average Speed (km/h)</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="1"
                  value={parameters.speed}
                  onChange={(e) => handleParameterChange('speed', parseFloat(e.target.value))}
                />
                <span>{parameters.speed} km/h</span>
              </div>
              <div className="form-group">
                <label>Primary Road Surface</label>
                <select
                  value={parameters.road_condition}
                  onChange={(e) => handleParameterChange('road_condition', e.target.value)}
                >
                  {roadConditions.map(condition => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={parameters.debug_mode}
                    onChange={(e) => handleParameterChange('debug_mode', e.target.checked)}
                  />
                  Enable Debug Mode
                </label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="form-button"
              >
                {loading ? 'Predicting...' : 'Predict Lifespan'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="results card">
          <h2>📊 Prediction Results</h2>
          <div className="results-grid">
            <div className="results-item">
              <p>Lifespan (km): <strong>{result.lifespan_km.toLocaleString()}</strong></p>
              <p>Tire Condition: <strong>{result.classification}</strong></p>
            </div>
            <div className="results-item">
              <p>Lifespan (miles): <strong>{result.lifespan_miles.toLocaleString()}</strong></p>
            </div>
          </div>
          <div className="progress-container">
            <label>Progress</label>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min((result.lifespan_km / 150000) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          {parameters.debug_mode && result.debug_info && (
            <div className="debug-info">
              <h3>🛠️ Debug Information</h3>
              <pre>{JSON.stringify(result.debug_info, null, 2)}</pre>
            </div>
          )}
          <div>
            <h3>🔧 Maintenance Suggestions</h3>
            {result.lifespan_km < 30000 ? (
              <div className="suggestion-box suggestion-short">
                <strong>Short Lifespan Detected</strong>
                <ul>
                  <li>Increase inspection frequency</li>
                  <li>Reduce heavy loads when possible</li>
                  <li>Check for alignment issues</li>
                  <li>Consider higher-grade tires</li>
                </ul>
              </div>
            ) : result.lifespan_km < 60000 ? (
              <div className="suggestion-box suggestion-average">
                <strong>Average Lifespan</strong>
                <ul>
                  <li>Regular maintenance schedule</li>
                  <li>Monitor tire pressure weekly</li>
                  <li>Rotate tires every 5,000 km</li>
                  <li>Check for uneven wear</li>
                </ul>
              </div>
            ) : (
              <div className="suggestion-box suggestion-long">
                <strong>Good Lifespan</strong>
                <ul>
                  <li>Continue current maintenance routine</li>
                  <li>Regular pressure checks</li>
                  <li>Monitor tread depth</li>
                  <li>Keep records of maintenance</li>
                </ul>
              </div>
            )}
          </div>
          {(parameters.pressure > 50 || parameters.load > 5000 || parameters.temp > 50 || parameters.speed > 120) && (
            <div className="warning">
              <strong>Note</strong>: Some inputs are outside typical ranges. Predictions may be less reliable.
            </div>
          )}
        </div>
      )}

      <footer>
        <p>
          *Disclaimer: Predictions are estimates based on machine learning models. Actual tire lifespan may vary.*
        </p>
      </footer>
    </div>
  );
}

export default App;