"""Autoencoder model for anomaly detection using deep learning."""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model, callbacks
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from typing import Dict, Any, List, Tuple, Optional
import joblib
import logging
from datetime import datetime
import mlflow
import mlflow.tensorflow

from ...config import model_config
from ...utils.explainability import ExplainabilityEngine

logger = logging.getLogger(__name__)

# Set TensorFlow logging level
tf.get_logger().setLevel('ERROR')


class AutoencoderModel:
    """Autoencoder model for detecting anomalous entity behavior using reconstruction error."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize Autoencoder model."""
        self.config = config or model_config['anomaly_detection']['autoencoder']
        self.model = None
        self.encoder = None
        self.decoder = None
        self.scaler = MinMaxScaler()  # Better for neural networks
        self.feature_names = None
        self.is_trained = False
        self.model_version = None
        self.explainer = ExplainabilityEngine()
        
        # Model parameters from config
        self.input_dim = self.config.get('input_dim', 50)
        self.encoding_dim = self.config.get('encoding_dim', 20)
        self.hidden_layers = self.config.get('hidden_layers', [40, 30, 20])
        self.dropout_rate = self.config.get('dropout_rate', 0.2)
        self.learning_rate = self.config.get('learning_rate', 0.001)
        self.epochs = self.config.get('epochs', 100)
        self.batch_size = self.config.get('batch_size', 32)
        self.validation_split = self.config.get('validation_split', 0.2)
        self.random_state = model_config['global']['random_state']
        
        # Training history
        self.training_history = None
        self.reconstruction_threshold = None
        
        # Set random seeds for reproducibility
        tf.random.set_seed(self.random_state)
        np.random.seed(self.random_state)
        
    def train(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        hyperparameter_tuning: bool = False,
        cross_validation: bool = True
    ) -> Dict[str, Any]:
        """Train the Autoencoder model."""
        logger.info("Starting Autoencoder training...")
        
        try:
            start_time = datetime.now()
            
            # Store feature names
            self.feature_names = list(X.columns)
            self.input_dim = len(self.feature_names)
            
            # Preprocess data
            X_scaled = self._preprocess_data(X, fit_scaler=True)
            
            # Split data for validation
            X_train, X_val = train_test_split(
                X_scaled, 
                test_size=self.validation_split,
                random_state=self.random_state
            )
            
            if hyperparameter_tuning:
                logger.info("Performing hyperparameter tuning...")
                self.model = self._hyperparameter_tuning(X_train, X_val)
            else:
                # Build and compile model
                self.model = self._build_model()
                self._compile_model()
                
                # Train the model
                logger.info("Training autoencoder...")
                self.training_history = self._train_model(X_train, X_val)
            
            # Calculate reconstruction threshold
            train_reconstructions = self.model.predict(X_train, verbose=0)
            train_errors = np.mean(np.square(X_train - train_reconstructions), axis=1)
            self.reconstruction_threshold = np.percentile(train_errors, 95)  # 95th percentile
            
            training_time = (datetime.now() - start_time).total_seconds()
            self.is_trained = True
            self.model_version = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Calculate training metrics
            val_reconstructions = self.model.predict(X_val, verbose=0)
            val_errors = np.mean(np.square(X_val - val_reconstructions), axis=1)
            
            metrics = {
                "model_type": "autoencoder",
                "input_dim": self.input_dim,
                "encoding_dim": self.encoding_dim,
                "hidden_layers": self.hidden_layers,
                "training_samples": len(X_train),
                "validation_samples": len(X_val),
                "feature_count": len(self.feature_names),
                "epochs_trained": len(self.training_history.history['loss']),
                "final_train_loss": float(self.training_history.history['loss'][-1]),
                "final_val_loss": float(self.training_history.history['val_loss'][-1]),
                "reconstruction_threshold": float(self.reconstruction_threshold),
                "mean_train_error": float(np.mean(train_errors)),
                "mean_val_error": float(np.mean(val_errors)),
                "training_time_seconds": training_time,
                "model_version": self.model_version
            }
            
            # Log to MLflow
            with mlflow.start_run(run_name=f"autoencoder_{self.model_version}"):
                mlflow.log_params({
                    "input_dim": self.input_dim,
                    "encoding_dim": self.encoding_dim,
                    "hidden_layers": str(self.hidden_layers),
                    "dropout_rate": self.dropout_rate,
                    "learning_rate": self.learning_rate,
                    "epochs": self.epochs,
                    "batch_size": self.batch_size
                })
                mlflow.log_metrics(metrics)
                mlflow.tensorflow.log_model(self.model, "autoencoder_model")
            
            logger.info(f"Autoencoder training completed in {training_time:.2f}s. "
                       f"Final validation loss: {metrics['final_val_loss']:.6f}, "
                       f"Reconstruction threshold: {self.reconstruction_threshold:.6f}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            raise
    
    def predict(self, X: pd.DataFrame) -> Dict[str, Any]:
        """Predict anomalies for input data."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        try:
            # Preprocess data
            X_scaled = self._preprocess_data(X, fit_scaler=False)
            
            # Get reconstructions
            reconstructions = self.model.predict(X_scaled, verbose=0)
            
            # Calculate reconstruction errors
            reconstruction_errors = np.mean(np.square(X_scaled - reconstructions), axis=1)
            
            # Convert to anomaly probabilities
            anomaly_scores = self._convert_errors_to_probabilities(reconstruction_errors)
            
            # Determine anomalies based on threshold
            is_anomaly = reconstruction_errors > self.reconstruction_threshold
            
            # Generate explanations for anomalies
            explanations = []
            patterns = []
            
            for i, (score, is_anom, error) in enumerate(zip(anomaly_scores, is_anomaly, reconstruction_errors)):
                if is_anom:
                    explanation = self._generate_explanation(
                        X.iloc[i],
                        X_scaled[i],
                        reconstructions[i],
                        score,
                        error
                    )
                    explanations.append(explanation)
                    patterns.append(explanation.get('detected_patterns', []))
                else:
                    explanations.append(None)
                    patterns.append([])
            
            results = {
                'scores': anomaly_scores.tolist(),
                'predictions': is_anomaly.tolist(),
                'reconstruction_errors': reconstruction_errors.tolist(),
                'explanations': explanations,
                'patterns': patterns,
                'confidence': self._calculate_confidence(reconstruction_errors, anomaly_scores),
                'model_version': self.model_version
            }
            
            return results
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise
    
    def predict_single(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict anomaly for a single entity."""
        # Convert to DataFrame
        X = pd.DataFrame([features])
        
        # Ensure all expected features are present
        for feature in self.feature_names:
            if feature not in X.columns:
                X[feature] = 0  # Default value for missing features
        
        # Reorder columns to match training data
        X = X[self.feature_names]
        
        # Get prediction
        result = self.predict(X)
        
        # Return single result
        return {
            'score': result['scores'][0],
            'is_anomaly': result['predictions'][0],
            'confidence': result['confidence'][0],
            'reconstruction_error': result['reconstruction_errors'][0],
            'explanation': result['explanations'][0],
            'patterns': result['patterns'][0]
        }
    
    def _preprocess_data(self, X: pd.DataFrame, fit_scaler: bool = False) -> np.ndarray:
        """Preprocess input data."""
        # Handle missing values
        X_clean = X.fillna(X.mean())
        
        # Handle infinite values
        X_clean = X_clean.replace([np.inf, -np.inf], np.nan)
        X_clean = X_clean.fillna(X_clean.mean())
        
        # Scale features to [0, 1] range (better for neural networks)
        if fit_scaler:
            X_scaled = self.scaler.fit_transform(X_clean)
        else:
            X_scaled = self.scaler.transform(X_clean)
        
        return X_scaled
    
    def _build_model(self) -> Model:
        """Build the autoencoder architecture."""
        # Input layer
        input_layer = layers.Input(shape=(self.input_dim,))
        
        # Encoder
        encoded = input_layer
        for i, units in enumerate(self.hidden_layers):
            encoded = layers.Dense(
                units,
                activation='relu',
                name=f'encoder_dense_{i}'
            )(encoded)
            encoded = layers.Dropout(self.dropout_rate, name=f'encoder_dropout_{i}')(encoded)
        
        # Bottleneck (latent representation)
        encoded = layers.Dense(self.encoding_dim, activation='relu', name='bottleneck')(encoded)
        
        # Decoder
        decoded = encoded
        for i, units in enumerate(reversed(self.hidden_layers)):
            decoded = layers.Dense(
                units,
                activation='relu',
                name=f'decoder_dense_{i}'
            )(decoded)
            decoded = layers.Dropout(self.dropout_rate, name=f'decoder_dropout_{i}')(decoded)
        
        # Output layer (reconstruction)
        decoded = layers.Dense(self.input_dim, activation='sigmoid', name='output')(decoded)
        
        # Create the autoencoder model
        autoencoder = Model(input_layer, decoded, name='autoencoder')
        
        # Create encoder model (for feature extraction)
        self.encoder = Model(input_layer, encoded, name='encoder')
        
        return autoencoder
    
    def _compile_model(self):
        """Compile the model with optimizer and loss function."""
        optimizer = keras.optimizers.Adam(learning_rate=self.learning_rate)
        
        self.model.compile(
            optimizer=optimizer,
            loss='mse',  # Mean Squared Error for reconstruction
            metrics=['mae']  # Mean Absolute Error as additional metric
        )
    
    def _train_model(self, X_train: np.ndarray, X_val: np.ndarray) -> callbacks.History:
        """Train the autoencoder model."""
        # Define callbacks
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        )
        
        # Train the model
        history = self.model.fit(
            X_train, X_train,  # Autoencoder learns to reconstruct input
            epochs=self.epochs,
            batch_size=self.batch_size,
            validation_data=(X_val, X_val),
            callbacks=[early_stopping, reduce_lr],
            verbose=1
        )
        
        return history
    
    def _hyperparameter_tuning(self, X_train: np.ndarray, X_val: np.ndarray) -> Model:
        """Perform hyperparameter tuning using Keras Tuner."""
        try:
            import keras_tuner as kt
            
            def build_model(hp):
                # Tunable hyperparameters
                encoding_dim = hp.Int('encoding_dim', 10, 50, step=5)
                n_layers = hp.Int('n_layers', 2, 5)
                dropout_rate = hp.Float('dropout_rate', 0.1, 0.5, step=0.1)
                learning_rate = hp.Choice('learning_rate', [1e-4, 1e-3, 1e-2])
                
                # Build model with tunable parameters
                input_layer = layers.Input(shape=(self.input_dim,))
                encoded = input_layer
                
                # Encoder layers
                for i in range(n_layers):
                    units = hp.Int(f'encoder_units_{i}', 20, 100, step=10)
                    encoded = layers.Dense(units, activation='relu')(encoded)
                    encoded = layers.Dropout(dropout_rate)(encoded)
                
                # Bottleneck
                encoded = layers.Dense(encoding_dim, activation='relu')(encoded)
                
                # Decoder layers
                decoded = encoded
                for i in range(n_layers):
                    units = hp.Int(f'decoder_units_{i}', 20, 100, step=10)
                    decoded = layers.Dense(units, activation='relu')(decoded)
                    decoded = layers.Dropout(dropout_rate)(decoded)
                
                # Output
                decoded = layers.Dense(self.input_dim, activation='sigmoid')(decoded)
                
                model = Model(input_layer, decoded)
                model.compile(
                    optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
                    loss='mse'
                )
                
                return model
            
            # Create tuner
            tuner = kt.RandomSearch(
                build_model,
                objective='val_loss',
                max_trials=20,
                directory='autoencoder_tuning',
                project_name='nexora_autoencoder'
            )
            
            # Search for best hyperparameters
            tuner.search(
                X_train, X_train,
                epochs=50,
                validation_data=(X_val, X_val),
                verbose=0
            )
            
            # Get best model
            best_model = tuner.get_best_models(num_models=1)[0]
            
            logger.info("Hyperparameter tuning completed")
            return best_model
            
        except ImportError:
            logger.warning("keras-tuner not available, using default parameters")
            model = self._build_model()
            self._compile_model()
            self.training_history = self._train_model(X_train, X_val)
            return model
    
    def _convert_errors_to_probabilities(self, reconstruction_errors: np.ndarray) -> np.ndarray:
        """Convert reconstruction errors to anomaly probabilities."""
        # Normalize errors to 0-1 scale using sigmoid transformation
        # Higher reconstruction error = higher anomaly probability
        
        # Use threshold as reference point
        normalized_errors = reconstruction_errors / (self.reconstruction_threshold + 1e-8)
        
        # Apply sigmoid transformation
        probabilities = 1 / (1 + np.exp(-2 * (normalized_errors - 1)))
        
        # Ensure probabilities are in [0, 1] range
        probabilities = np.clip(probabilities, 0, 1)
        
        return probabilities
    
    def _calculate_confidence(
        self,
        reconstruction_errors: np.ndarray,
        anomaly_scores: np.ndarray
    ) -> List[float]:
        """Calculate confidence scores for predictions."""
        confidence_scores = []
        
        for error, score in zip(reconstruction_errors, anomaly_scores):
            # Confidence based on distance from threshold
            error_ratio = error / (self.reconstruction_threshold + 1e-8)
            
            if error_ratio > 2.0:  # Very high error
                confidence = 0.95
            elif error_ratio > 1.5:  # High error
                confidence = 0.8 + (error_ratio - 1.5) * 0.3
            elif error_ratio < 0.5:  # Very low error
                confidence = 0.95
            elif error_ratio < 0.8:  # Low error
                confidence = 0.7 + (0.8 - error_ratio) * 0.83
            else:  # Near threshold - lower confidence
                confidence = 0.4 + abs(error_ratio - 1.0) * 0.3
            
            confidence_scores.append(min(confidence, 0.95))
        
        return confidence_scores
    
    def _generate_explanation(
        self,
        original_features: pd.Series,
        scaled_features: np.ndarray,
        reconstruction: np.ndarray,
        anomaly_score: float,
        reconstruction_error: float
    ) -> Dict[str, Any]:
        """Generate explanation for anomaly detection."""
        try:
            # Calculate per-feature reconstruction errors
            feature_errors = np.square(scaled_features - reconstruction)
            
            # Identify features with highest reconstruction errors
            top_error_indices = np.argsort(feature_errors)[-5:]  # Top 5 features
            top_features = [(self.feature_names[i], feature_errors[i]) for i in top_error_indices]
            top_features = sorted(top_features, key=lambda x: x[1], reverse=True)
            
            # Detect patterns based on feature analysis
            detected_patterns = self._detect_patterns(original_features, top_features)
            
            # Generate human-readable explanation
            explanation_text = self._generate_explanation_text(
                top_features,
                anomaly_score,
                reconstruction_error,
                detected_patterns
            )
            
            return {
                'anomaly_score': float(anomaly_score),
                'reconstruction_error': float(reconstruction_error),
                'feature_errors': dict(top_features),
                'detected_patterns': detected_patterns,
                'explanation_text': explanation_text,
                'top_contributing_features': [f[0] for f in top_features[:3]],
                'error_vs_threshold': float(reconstruction_error / self.reconstruction_threshold)
            }
            
        except Exception as e:
            logger.warning(f"Failed to generate explanation: {str(e)}")
            return {
                'anomaly_score': float(anomaly_score),
                'reconstruction_error': float(reconstruction_error),
                'explanation_text': f"Anomaly detected with score {anomaly_score:.3f}",
                'detected_patterns': ['reconstruction_anomaly']
            }
    
    def _detect_patterns(
        self,
        original_features: pd.Series,
        top_features: List[Tuple[str, float]]
    ) -> List[str]:
        """Detect anomaly patterns based on reconstruction errors."""
        patterns = []
        
        for feature_name, error in top_features:
            if error > 0.1:  # Significant reconstruction error
                value = original_features[feature_name]
                
                # Pattern detection based on feature names and values
                if 'frequency' in feature_name.lower():
                    if value > 100:
                        patterns.append('unusual_frequency_pattern')
                    elif value < 0.1:
                        patterns.append('abnormal_low_frequency')
                elif 'time' in feature_name.lower():
                    patterns.append('temporal_anomaly')
                elif 'access' in feature_name.lower():
                    patterns.append('access_pattern_anomaly')
                elif 'network' in feature_name.lower():
                    patterns.append('network_behavior_anomaly')
                elif 'resource' in feature_name.lower():
                    patterns.append('resource_usage_anomaly')
                else:
                    patterns.append(f'reconstruction_error_{feature_name}')
        
        # Add general patterns
        if len(patterns) == 0:
            patterns.append('general_reconstruction_anomaly')
        
        return patterns[:5]  # Limit to top 5 patterns
    
    def _generate_explanation_text(
        self,
        top_features: List[Tuple[str, float]],
        anomaly_score: float,
        reconstruction_error: float,
        patterns: List[str]
    ) -> str:
        """Generate human-readable explanation text."""
        if anomaly_score > 0.8:
            severity = "high"
        elif anomaly_score > 0.6:
            severity = "medium"
        else:
            severity = "low"
        
        explanation = f"Detected {severity} anomaly (score: {anomaly_score:.3f}, "
        explanation += f"reconstruction error: {reconstruction_error:.6f}). "
        
        if top_features:
            top_feature_names = [f[0] for f in top_features[:3]]
            explanation += f"Features with highest reconstruction errors: {', '.join(top_feature_names)}. "
        
        if patterns:
            explanation += f"Detected patterns: {', '.join(patterns[:3])}."
        
        return explanation
    
    def get_latent_representation(self, X: pd.DataFrame) -> np.ndarray:
        """Get latent representation of input data using the encoder."""
        if not self.is_trained or self.encoder is None:
            raise ValueError("Model must be trained before extracting latent representations")
        
        X_scaled = self._preprocess_data(X, fit_scaler=False)
        return self.encoder.predict(X_scaled, verbose=0)
    
    def save_model(self, filepath: str) -> None:
        """Save the trained model to disk."""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        # Save TensorFlow model
        model_path = f"{filepath}_model"
        self.model.save(model_path)
        
        # Save encoder separately
        encoder_path = f"{filepath}_encoder"
        if self.encoder:
            self.encoder.save(encoder_path)
        
        # Save other components
        metadata = {
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'config': self.config,
            'model_version': self.model_version,
            'is_trained': self.is_trained,
            'reconstruction_threshold': self.reconstruction_threshold,
            'training_history': self.training_history.history if self.training_history else None
        }
        
        joblib.dump(metadata, f"{filepath}_metadata.pkl")
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """Load a trained model from disk."""
        # Load TensorFlow model
        model_path = f"{filepath}_model"
        self.model = keras.models.load_model(model_path)
        
        # Load encoder
        encoder_path = f"{filepath}_encoder"
        try:
            self.encoder = keras.models.load_model(encoder_path)
        except:
            logger.warning("Could not load encoder model")
        
        # Load metadata
        metadata = joblib.load(f"{filepath}_metadata.pkl")
        
        self.scaler = metadata['scaler']
        self.feature_names = metadata['feature_names']
        self.config = metadata['config']
        self.model_version = metadata['model_version']
        self.is_trained = metadata['is_trained']
        self.reconstruction_threshold = metadata['reconstruction_threshold']
        
        logger.info(f"Model loaded from {filepath}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the model."""
        return {
            'model_type': 'autoencoder',
            'is_trained': self.is_trained,
            'model_version': self.model_version,
            'feature_count': len(self.feature_names) if self.feature_names else 0,
            'feature_names': self.feature_names,
            'config': self.config,
            'reconstruction_threshold': self.reconstruction_threshold,
            'parameters': {
                'input_dim': self.input_dim,
                'encoding_dim': self.encoding_dim,
                'hidden_layers': self.hidden_layers,
                'dropout_rate': self.dropout_rate,
                'learning_rate': self.learning_rate,
                'epochs': self.epochs,
                'batch_size': self.batch_size
            } if self.model else None,
            'model_summary': str(self.model.summary()) if self.model else None
        }
