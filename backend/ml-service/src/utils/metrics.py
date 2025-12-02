"""Metrics and monitoring utilities for ML models."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from collections import defaultdict, deque
import asyncio
import json

logger = logging.getLogger(__name__)


class ModelMetrics:
    """Track and analyze model performance metrics."""
    
    def __init__(self):
        """Initialize metrics tracker."""
        self.prediction_history = deque(maxlen=10000)  # Last 10k predictions
        self.performance_metrics = {}
        self.drift_metrics = {}
        self.error_tracking = defaultdict(list)
        
    async def record_prediction_batch(
        self,
        request_id: str,
        entity_count: int,
        processing_time_ms: float,
        anomaly_count: int,
        morphing_count: int
    ):
        """Record metrics for a prediction batch."""
        try:
            record = {
                'timestamp': datetime.utcnow(),
                'request_id': request_id,
                'entity_count': entity_count,
                'processing_time_ms': processing_time_ms,
                'anomaly_count': anomaly_count,
                'morphing_count': morphing_count,
                'anomaly_rate': anomaly_count / entity_count if entity_count > 0 else 0,
                'morphing_rate': morphing_count / entity_count if entity_count > 0 else 0,
                'throughput': entity_count / (processing_time_ms / 1000) if processing_time_ms > 0 else 0
            }
            
            self.prediction_history.append(record)
            await self._update_performance_metrics()
            
        except Exception as e:
            logger.error(f"Failed to record prediction batch: {str(e)}")
    
    async def record_prediction_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """Record prediction errors for analysis."""
        try:
            error_record = {
                'timestamp': datetime.utcnow(),
                'error_type': error_type,
                'error_message': error_message,
                'context': context or {}
            }
            
            self.error_tracking[error_type].append(error_record)
            
            # Keep only last 1000 errors per type
            if len(self.error_tracking[error_type]) > 1000:
                self.error_tracking[error_type] = self.error_tracking[error_type][-1000:]
                
        except Exception as e:
            logger.error(f"Failed to record prediction error: {str(e)}")
    
    async def _update_performance_metrics(self):
        """Update aggregated performance metrics."""
        try:
            if not self.prediction_history:
                return
            
            # Convert to DataFrame for easier analysis
            df = pd.DataFrame(list(self.prediction_history))
            
            # Time-based metrics
            now = datetime.utcnow()
            last_hour = now - timedelta(hours=1)
            last_day = now - timedelta(days=1)
            
            hour_data = df[df['timestamp'] >= last_hour]
            day_data = df[df['timestamp'] >= last_day]
            
            # Calculate metrics
            self.performance_metrics = {
                'last_updated': now.isoformat(),
                'total_predictions': len(df),
                'last_hour': self._calculate_period_metrics(hour_data),
                'last_day': self._calculate_period_metrics(day_data),
                'overall': self._calculate_period_metrics(df)
            }
            
        except Exception as e:
            logger.error(f"Failed to update performance metrics: {str(e)}")
    
    def _calculate_period_metrics(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Calculate metrics for a specific time period."""
        if data.empty:
            return {
                'request_count': 0,
                'entity_count': 0,
                'avg_processing_time_ms': 0,
                'avg_throughput': 0,
                'anomaly_rate': 0,
                'morphing_rate': 0,
                'error_rate': 0
            }
        
        return {
            'request_count': len(data),
            'entity_count': int(data['entity_count'].sum()),
            'avg_processing_time_ms': float(data['processing_time_ms'].mean()),
            'p95_processing_time_ms': float(data['processing_time_ms'].quantile(0.95)),
            'p99_processing_time_ms': float(data['processing_time_ms'].quantile(0.99)),
            'avg_throughput': float(data['throughput'].mean()),
            'max_throughput': float(data['throughput'].max()),
            'anomaly_rate': float(data['anomaly_rate'].mean()),
            'morphing_rate': float(data['morphing_rate'].mean()),
            'total_anomalies': int(data['anomaly_count'].sum()),
            'total_morphing': int(data['morphing_count'].sum())
        }
    
    async def detect_performance_drift(self) -> Dict[str, Any]:
        """Detect performance drift in model predictions."""
        try:
            if len(self.prediction_history) < 100:
                return {'status': 'insufficient_data', 'message': 'Need at least 100 predictions for drift detection'}
            
            # Convert to DataFrame
            df = pd.DataFrame(list(self.prediction_history))
            
            # Split into recent and historical data
            split_point = len(df) // 2
            historical = df.iloc[:split_point]
            recent = df.iloc[split_point:]
            
            drift_results = {}
            
            # Anomaly rate drift
            hist_anomaly_rate = historical['anomaly_rate'].mean()
            recent_anomaly_rate = recent['anomaly_rate'].mean()
            anomaly_drift = abs(recent_anomaly_rate - hist_anomaly_rate)
            
            drift_results['anomaly_rate_drift'] = {
                'historical_rate': float(hist_anomaly_rate),
                'recent_rate': float(recent_anomaly_rate),
                'drift_magnitude': float(anomaly_drift),
                'is_significant': anomaly_drift > 0.1  # 10% threshold
            }
            
            # Processing time drift
            hist_processing_time = historical['processing_time_ms'].mean()
            recent_processing_time = recent['processing_time_ms'].mean()
            time_drift = abs(recent_processing_time - hist_processing_time) / hist_processing_time if hist_processing_time > 0 else 0
            
            drift_results['processing_time_drift'] = {
                'historical_time_ms': float(hist_processing_time),
                'recent_time_ms': float(recent_processing_time),
                'drift_percentage': float(time_drift * 100),
                'is_significant': time_drift > 0.2  # 20% threshold
            }
            
            # Throughput drift
            hist_throughput = historical['throughput'].mean()
            recent_throughput = recent['throughput'].mean()
            throughput_drift = abs(recent_throughput - hist_throughput) / hist_throughput if hist_throughput > 0 else 0
            
            drift_results['throughput_drift'] = {
                'historical_throughput': float(hist_throughput),
                'recent_throughput': float(recent_throughput),
                'drift_percentage': float(throughput_drift * 100),
                'is_significant': throughput_drift > 0.2  # 20% threshold
            }
            
            # Overall drift assessment
            significant_drifts = sum(1 for result in drift_results.values() if result.get('is_significant', False))
            
            drift_results['overall_assessment'] = {
                'significant_drifts': significant_drifts,
                'total_metrics': len(drift_results),
                'drift_detected': significant_drifts > 0,
                'severity': 'high' if significant_drifts >= 2 else 'medium' if significant_drifts == 1 else 'low'
            }
            
            return drift_results
            
        except Exception as e:
            logger.error(f"Failed to detect performance drift: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_error_analysis(self) -> Dict[str, Any]:
        """Analyze prediction errors."""
        try:
            analysis = {
                'error_summary': {},
                'error_trends': {},
                'top_errors': []
            }
            
            # Error summary by type
            for error_type, errors in self.error_tracking.items():
                recent_errors = [e for e in errors if e['timestamp'] >= datetime.utcnow() - timedelta(hours=24)]
                
                analysis['error_summary'][error_type] = {
                    'total_count': len(errors),
                    'recent_count': len(recent_errors),
                    'error_rate': len(recent_errors) / 24 if recent_errors else 0  # errors per hour
                }
            
            # Error trends (last 24 hours)
            now = datetime.utcnow()
            hourly_errors = defaultdict(int)
            
            for errors in self.error_tracking.values():
                for error in errors:
                    if error['timestamp'] >= now - timedelta(hours=24):
                        hour_key = error['timestamp'].replace(minute=0, second=0, microsecond=0)
                        hourly_errors[hour_key] += 1
            
            analysis['error_trends'] = {
                hour.isoformat(): count 
                for hour, count in sorted(hourly_errors.items())
            }
            
            # Top error messages
            all_errors = []
            for errors in self.error_tracking.values():
                all_errors.extend(errors[-100:])  # Last 100 errors per type
            
            # Group by error message
            error_counts = defaultdict(int)
            error_examples = {}
            
            for error in all_errors:
                msg = error['error_message']
                error_counts[msg] += 1
                if msg not in error_examples:
                    error_examples[msg] = error
            
            # Sort by frequency
            top_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10]
            
            analysis['top_errors'] = [
                {
                    'error_message': msg,
                    'count': count,
                    'last_occurrence': error_examples[msg]['timestamp'].isoformat(),
                    'error_type': error_examples[msg]['error_type']
                }
                for msg, count in top_errors
            ]
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze errors: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    async def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        try:
            report = {
                'report_timestamp': datetime.utcnow().isoformat(),
                'performance_metrics': self.performance_metrics,
                'drift_analysis': await self.detect_performance_drift(),
                'error_analysis': await self.get_error_analysis(),
                'recommendations': await self._generate_performance_recommendations()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate performance report: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    async def _generate_performance_recommendations(self) -> List[Dict[str, Any]]:
        """Generate performance improvement recommendations."""
        recommendations = []
        
        try:
            if not self.performance_metrics:
                return recommendations
            
            # Check processing time
            last_hour = self.performance_metrics.get('last_hour', {})
            avg_processing_time = last_hour.get('avg_processing_time_ms', 0)
            
            if avg_processing_time > 5000:  # > 5 seconds
                recommendations.append({
                    'type': 'performance',
                    'priority': 'high',
                    'issue': 'High processing time',
                    'recommendation': 'Consider model optimization or scaling up resources',
                    'metric': f'Average processing time: {avg_processing_time:.1f}ms'
                })
            
            # Check throughput
            avg_throughput = last_hour.get('avg_throughput', 0)
            if avg_throughput < 10:  # < 10 entities per second
                recommendations.append({
                    'type': 'performance',
                    'priority': 'medium',
                    'issue': 'Low throughput',
                    'recommendation': 'Consider batch processing optimization or parallel processing',
                    'metric': f'Average throughput: {avg_throughput:.1f} entities/sec'
                })
            
            # Check anomaly rate
            anomaly_rate = last_hour.get('anomaly_rate', 0)
            if anomaly_rate > 0.5:  # > 50% anomaly rate
                recommendations.append({
                    'type': 'model',
                    'priority': 'high',
                    'issue': 'High anomaly rate',
                    'recommendation': 'Review model thresholds or retrain with recent data',
                    'metric': f'Anomaly rate: {anomaly_rate:.1%}'
                })
            elif anomaly_rate < 0.01:  # < 1% anomaly rate
                recommendations.append({
                    'type': 'model',
                    'priority': 'medium',
                    'issue': 'Very low anomaly rate',
                    'recommendation': 'Verify model sensitivity and threshold settings',
                    'metric': f'Anomaly rate: {anomaly_rate:.1%}'
                })
            
            # Check error rates
            error_analysis = await self.get_error_analysis()
            error_summary = error_analysis.get('error_summary', {})
            
            for error_type, summary in error_summary.items():
                error_rate = summary.get('error_rate', 0)
                if error_rate > 1:  # > 1 error per hour
                    recommendations.append({
                        'type': 'reliability',
                        'priority': 'high',
                        'issue': f'High {error_type} error rate',
                        'recommendation': 'Investigate and fix underlying issues',
                        'metric': f'Error rate: {error_rate:.1f} errors/hour'
                    })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {str(e)}")
            return []


class TrainingMetrics:
    """Track and analyze model training metrics."""
    
    def __init__(self):
        """Initialize training metrics tracker."""
        self.training_history = []
        self.model_performance = {}
        
    async def record_training_session(
        self,
        model_type: str,
        training_duration: float,
        training_samples: int,
        validation_samples: int,
        final_metrics: Dict[str, Any]
    ):
        """Record metrics for a training session."""
        try:
            session_record = {
                'timestamp': datetime.utcnow(),
                'model_type': model_type,
                'training_duration': training_duration,
                'training_samples': training_samples,
                'validation_samples': validation_samples,
                'metrics': final_metrics
            }
            
            self.training_history.append(session_record)
            
            # Keep only last 100 training sessions
            if len(self.training_history) > 100:
                self.training_history = self.training_history[-100:]
            
            await self._update_model_performance(model_type, final_metrics)
            
        except Exception as e:
            logger.error(f"Failed to record training session: {str(e)}")
    
    async def _update_model_performance(self, model_type: str, metrics: Dict[str, Any]):
        """Update model performance tracking."""
        try:
            if model_type not in self.model_performance:
                self.model_performance[model_type] = {
                    'training_count': 0,
                    'best_metrics': {},
                    'latest_metrics': {},
                    'performance_trend': []
                }
            
            perf = self.model_performance[model_type]
            perf['training_count'] += 1
            perf['latest_metrics'] = metrics
            
            # Update best metrics
            for metric_name, value in metrics.items():
                if isinstance(value, (int, float)):
                    if metric_name not in perf['best_metrics']:
                        perf['best_metrics'][metric_name] = value
                    else:
                        # Assume higher is better for most metrics
                        if value > perf['best_metrics'][metric_name]:
                            perf['best_metrics'][metric_name] = value
            
            # Add to performance trend
            perf['performance_trend'].append({
                'timestamp': datetime.utcnow().isoformat(),
                'metrics': metrics
            })
            
            # Keep only last 50 trend points
            if len(perf['performance_trend']) > 50:
                perf['performance_trend'] = perf['performance_trend'][-50:]
                
        except Exception as e:
            logger.error(f"Failed to update model performance: {str(e)}")
    
    async def get_training_report(self) -> Dict[str, Any]:
        """Generate comprehensive training report."""
        try:
            report = {
                'report_timestamp': datetime.utcnow().isoformat(),
                'training_summary': self._get_training_summary(),
                'model_performance': self.model_performance,
                'training_trends': self._analyze_training_trends(),
                'recommendations': self._generate_training_recommendations()
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate training report: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def _get_training_summary(self) -> Dict[str, Any]:
        """Get summary of training activities."""
        if not self.training_history:
            return {'total_sessions': 0}
        
        df = pd.DataFrame(self.training_history)
        
        return {
            'total_sessions': len(df),
            'models_trained': df['model_type'].nunique(),
            'avg_training_duration': float(df['training_duration'].mean()),
            'total_training_time': float(df['training_duration'].sum()),
            'avg_training_samples': float(df['training_samples'].mean()),
            'last_training': df['timestamp'].max().isoformat()
        }
    
    def _analyze_training_trends(self) -> Dict[str, Any]:
        """Analyze trends in training performance."""
        trends = {}
        
        for model_type, perf in self.model_performance.items():
            trend_data = perf['performance_trend']
            
            if len(trend_data) < 2:
                trends[model_type] = {'status': 'insufficient_data'}
                continue
            
            # Analyze trend for key metrics
            recent_metrics = trend_data[-5:]  # Last 5 training sessions
            older_metrics = trend_data[-10:-5] if len(trend_data) >= 10 else trend_data[:-5]
            
            if not older_metrics:
                trends[model_type] = {'status': 'insufficient_historical_data'}
                continue
            
            # Calculate average improvement
            metric_trends = {}
            for metric_name in recent_metrics[0]['metrics'].keys():
                if isinstance(recent_metrics[0]['metrics'][metric_name], (int, float)):
                    recent_avg = np.mean([m['metrics'][metric_name] for m in recent_metrics])
                    older_avg = np.mean([m['metrics'][metric_name] for m in older_metrics])
                    
                    if older_avg != 0:
                        improvement = (recent_avg - older_avg) / older_avg
                        metric_trends[metric_name] = {
                            'improvement_percentage': float(improvement * 100),
                            'trend': 'improving' if improvement > 0.05 else 'declining' if improvement < -0.05 else 'stable'
                        }
            
            trends[model_type] = {
                'status': 'analyzed',
                'metric_trends': metric_trends,
                'overall_trend': self._determine_overall_trend(metric_trends)
            }
        
        return trends
    
    def _determine_overall_trend(self, metric_trends: Dict[str, Dict[str, Any]]) -> str:
        """Determine overall performance trend."""
        if not metric_trends:
            return 'unknown'
        
        improving_count = sum(1 for trend in metric_trends.values() if trend['trend'] == 'improving')
        declining_count = sum(1 for trend in metric_trends.values() if trend['trend'] == 'declining')
        
        if improving_count > declining_count:
            return 'improving'
        elif declining_count > improving_count:
            return 'declining'
        else:
            return 'stable'
    
    def _generate_training_recommendations(self) -> List[Dict[str, Any]]:
        """Generate training improvement recommendations."""
        recommendations = []
        
        try:
            # Check training frequency
            if len(self.training_history) > 0:
                last_training = max(session['timestamp'] for session in self.training_history)
                days_since_training = (datetime.utcnow() - last_training).days
                
                if days_since_training > 7:
                    recommendations.append({
                        'type': 'training_schedule',
                        'priority': 'medium',
                        'issue': 'Infrequent training',
                        'recommendation': 'Consider more frequent model retraining to maintain performance',
                        'details': f'Last training was {days_since_training} days ago'
                    })
            
            # Check model performance trends
            for model_type, perf in self.model_performance.items():
                trend_data = perf.get('performance_trend', [])
                
                if len(trend_data) >= 3:
                    # Check if performance is declining
                    recent_scores = []
                    for session in trend_data[-3:]:
                        metrics = session['metrics']
                        # Look for common performance metrics
                        for metric_name in ['accuracy', 'f1_score', 'precision', 'recall']:
                            if metric_name in metrics:
                                recent_scores.append(metrics[metric_name])
                                break
                    
                    if len(recent_scores) >= 2:
                        if recent_scores[-1] < recent_scores[0] * 0.95:  # 5% decline
                            recommendations.append({
                                'type': 'model_performance',
                                'priority': 'high',
                                'issue': f'{model_type} performance declining',
                                'recommendation': 'Investigate data quality or consider hyperparameter tuning',
                                'details': f'Performance declined from {recent_scores[0]:.3f} to {recent_scores[-1]:.3f}'
                            })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate training recommendations: {str(e)}")
            return []
