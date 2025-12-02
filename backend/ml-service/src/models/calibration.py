"""Model calibration for stable, comparable anomaly scores."""

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.preprocessing import StandardScaler
from typing import Optional, Tuple
import logging
import joblib

logger = logging.getLogger(__name__)


class AnomalyScoreCalibrator:
    """Calibrate anomaly scores to stable 0-1 probability range."""
    
    def __init__(self):
        """Initialize calibrator."""
        self.calibrator = IsotonicRegression(out_of_bounds='clip')
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.calibration_metadata = {}
        
    def fit(self, raw_scores: np.ndarray, y_true: Optional[np.ndarray] = None) -> 'AnomalyScoreCalibrator':
        """
        Fit calibrator on validation data.
        
        Args:
            raw_scores: Raw anomaly scores from model
            y_true: True labels (1=anomaly, 0=normal). If None, uses ECDF ranking.
        """
        try:
            raw_scores = np.asarray(raw_scores).flatten()
            
            if y_true is not None:
                # Supervised calibration with known anomalies
                y_true = np.asarray(y_true).flatten()
                if len(raw_scores) != len(y_true):
                    raise ValueError("raw_scores and y_true must have same length")
                
                self.calibrator.fit(raw_scores, y_true)
                self.calibration_metadata['method'] = 'supervised'
                self.calibration_metadata['n_samples'] = len(raw_scores)
                self.calibration_metadata['n_anomalies'] = int(y_true.sum())
                
            else:
                # Unsupervised calibration using ECDF (empirical CDF)
                # Maps raw scores to percentile ranks
                ranks = np.argsort(np.argsort(raw_scores)) / (len(raw_scores) - 1)
                self.calibrator.fit(raw_scores, ranks)
                self.calibration_metadata['method'] = 'unsupervised_ecdf'
                self.calibration_metadata['n_samples'] = len(raw_scores)
            
            self.is_fitted = True
            logger.info(f"Calibrator fitted: {self.calibration_metadata}")
            return self
            
        except Exception as e:
            logger.error(f"Calibration fitting failed: {str(e)}")
            raise
    
    def transform(self, raw_scores: np.ndarray) -> np.ndarray:
        """
        Transform raw scores to calibrated probabilities.
        
        Args:
            raw_scores: Raw anomaly scores
            
        Returns:
            Calibrated probabilities in [0, 1]
        """
        if not self.is_fitted:
            raise ValueError("Calibrator must be fitted before transform")
        
        try:
            raw_scores = np.asarray(raw_scores).flatten()
            calibrated = self.calibrator.predict(raw_scores)
            return np.clip(calibrated, 0.0, 1.0)
            
        except Exception as e:
            logger.error(f"Calibration transform failed: {str(e)}")
            raise
    
    def fit_transform(self, raw_scores: np.ndarray, y_true: Optional[np.ndarray] = None) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(raw_scores, y_true)
        return self.transform(raw_scores)
    
    def save(self, filepath: str) -> None:
        """Save calibrator to disk."""
        try:
            joblib.dump({
                'calibrator': self.calibrator,
                'scaler': self.scaler,
                'is_fitted': self.is_fitted,
                'metadata': self.calibration_metadata
            }, filepath)
            logger.info(f"Calibrator saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save calibrator: {str(e)}")
            raise
    
    def load(self, filepath: str) -> 'AnomalyScoreCalibrator':
        """Load calibrator from disk."""
        try:
            data = joblib.load(filepath)
            self.calibrator = data['calibrator']
            self.scaler = data['scaler']
            self.is_fitted = data['is_fitted']
            self.calibration_metadata = data['metadata']
            logger.info(f"Calibrator loaded from {filepath}")
            return self
        except Exception as e:
            logger.error(f"Failed to load calibrator: {str(e)}")
            raise
    
    def get_metadata(self) -> dict:
        """Get calibration metadata."""
        return {
            'is_fitted': self.is_fitted,
            **self.calibration_metadata
        }
