"""Temporal feature extraction for time-based patterns."""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TenantIsolationError(Exception):
    """Raised when cross-tenant data is detected."""
    pass

import defaultdict
import asyncio

from ..config import model_config

logger = logging.getLogger(__name__)


class TemporalFeatureExtractor:
    """Extract temporal features from entity activity data."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize temporal feature extractor."""
        self.config = config or model_config['features']['temporal']
        
        # Time windows for aggregation
        self.time_windows = self.config.get('time_windows', ['1h', '6h', '24h', '7d'])
        self.aggregations = self.config.get('aggregations', ['mean', 'std', 'min', 'max', 'count'])
        
        # Feature cache
        self.feature_cache = {}
        
    async def extract(self, timestamp: datetime, activity_data: Dict[str, Any], tenant_id: str) -> Dict[str, float]:
        """Extract temporal features from activity data with tenant isolation."""
        try:
            # CRITICAL: Validate tenant isolation
            if 'tenant_id' in activity_data:
                data_tenant = activity_data.get('tenant_id')
                if data_tenant != tenant_id:
                    raise TenantIsolationError(
                        f"Cross-tenant data rejected: expected {tenant_id}, got {data_tenant}"
                    )
            
            # Log tenant context for audit
            logger.info(f"Extracting temporal features for tenant: {tenant_id}")
            
            features = {}
            features['tenant_id_hash'] = hash(tenant_id) % 1000000
            
            # Basic time-based features
            time_features = await self._extract_time_features(timestamp)
            features.update(time_features)
            
            # Periodicity features
            periodicity_features = await self._extract_periodicity_features(timestamp, activity_data)
            features.update(periodicity_features)
            
            # Temporal patterns
            pattern_features = await self._extract_temporal_patterns(timestamp, activity_data)
            features.update(pattern_features)
            
            # Time window aggregations
            window_features = await self._extract_window_features(timestamp, activity_data)
            features.update(window_features)
            
            # Seasonal features
            seasonal_features = await self._extract_seasonal_features(timestamp)
            features.update(seasonal_features)
            
            return features
            
        except TenantIsolationError:
            raise
        except Exception as e:
            logger.error(f"Temporal feature extraction failed for tenant {tenant_id}: {str(e)}")
            return {}
    
    async def _extract_time_features(self, timestamp: datetime) -> Dict[str, float]:
        """Extract basic time-based features."""
        features = {}
        
        try:
            # Hour of day (0-23)
            features['hour_of_day'] = float(timestamp.hour)
            features['hour_sin'] = float(np.sin(2 * np.pi * timestamp.hour / 24))
            features['hour_cos'] = float(np.cos(2 * np.pi * timestamp.hour / 24))
            
            # Day of week (0=Monday, 6=Sunday)
            features['day_of_week'] = float(timestamp.weekday())
            features['day_sin'] = float(np.sin(2 * np.pi * timestamp.weekday() / 7))
            features['day_cos'] = float(np.cos(2 * np.pi * timestamp.weekday() / 7))
            
            # Day of month (1-31)
            features['day_of_month'] = float(timestamp.day)
            features['day_of_month_sin'] = float(np.sin(2 * np.pi * timestamp.day / 31))
            features['day_of_month_cos'] = float(np.cos(2 * np.pi * timestamp.day / 31))
            
            # Month of year (1-12)
            features['month_of_year'] = float(timestamp.month)
            features['month_sin'] = float(np.sin(2 * np.pi * timestamp.month / 12))
            features['month_cos'] = float(np.cos(2 * np.pi * timestamp.month / 12))
            
            # Week of year (1-53)
            week_of_year = timestamp.isocalendar()[1]
            features['week_of_year'] = float(week_of_year)
            features['week_sin'] = float(np.sin(2 * np.pi * week_of_year / 53))
            features['week_cos'] = float(np.cos(2 * np.pi * week_of_year / 53))
            
            # Quarter of year (1-4)
            quarter = (timestamp.month - 1) // 3 + 1
            features['quarter'] = float(quarter)
            
            # Business day indicators
            features['is_weekend'] = float(timestamp.weekday() >= 5)
            features['is_weekday'] = float(timestamp.weekday() < 5)
            
            # Business hours (9 AM - 5 PM)
            features['is_business_hours'] = float(9 <= timestamp.hour <= 17)
            features['is_off_hours'] = float(timestamp.hour < 9 or timestamp.hour > 17)
            
            # Time of day categories
            if 6 <= timestamp.hour < 12:
                features['time_category'] = 1.0  # Morning
            elif 12 <= timestamp.hour < 18:
                features['time_category'] = 2.0  # Afternoon
            elif 18 <= timestamp.hour < 22:
                features['time_category'] = 3.0  # Evening
            else:
                features['time_category'] = 4.0  # Night
            
            # Unix timestamp (for trend analysis)
            features['unix_timestamp'] = float(timestamp.timestamp())
            
        except Exception as e:
            logger.error(f"Time feature extraction failed: {str(e)}")
        
        return features
    
    async def _extract_periodicity_features(self, timestamp: datetime, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract periodicity and rhythm features."""
        features = {}
        
        try:
            # Activity history for periodicity analysis
            activity_history = activity_data.get('activity_history', [])
            
            if activity_history:
                # Convert to timestamps
                hist_timestamps = [pd.to_datetime(ts) for ts in activity_history]
                hist_timestamps.sort()
                
                # Calculate intervals between activities
                if len(hist_timestamps) > 1:
                    intervals = [(hist_timestamps[i+1] - hist_timestamps[i]).total_seconds() 
                               for i in range(len(hist_timestamps)-1)]
                    
                    # Interval statistics
                    features['avg_activity_interval'] = float(np.mean(intervals))
                    features['std_activity_interval'] = float(np.std(intervals))
                    features['min_activity_interval'] = float(np.min(intervals))
                    features['max_activity_interval'] = float(np.max(intervals))
                    
                    # Regularity measure (coefficient of variation)
                    if np.mean(intervals) > 0:
                        features['activity_regularity'] = float(np.std(intervals) / np.mean(intervals))
                    else:
                        features['activity_regularity'] = 0.0
                    
                    # Detect periodic patterns
                    periodic_features = self._detect_periodic_patterns(intervals)
                    features.update(periodic_features)
                
                # Time since last activity
                if hist_timestamps:
                    last_activity = max(hist_timestamps)
                    time_since_last = (timestamp - last_activity).total_seconds()
                    features['time_since_last_activity'] = float(time_since_last)
                else:
                    features['time_since_last_activity'] = 0.0
                
                # Activity frequency by time periods
                hourly_counts = defaultdict(int)
                daily_counts = defaultdict(int)
                
                for ts in hist_timestamps:
                    hourly_counts[ts.hour] += 1
                    daily_counts[ts.weekday()] += 1
                
                # Peak activity hours
                if hourly_counts:
                    peak_hour = max(hourly_counts, key=hourly_counts.get)
                    features['peak_activity_hour'] = float(peak_hour)
                    features['peak_hour_activity_ratio'] = float(hourly_counts[peak_hour] / len(hist_timestamps))
                else:
                    features['peak_activity_hour'] = 0.0
                    features['peak_hour_activity_ratio'] = 0.0
                
                # Peak activity days
                if daily_counts:
                    peak_day = max(daily_counts, key=daily_counts.get)
                    features['peak_activity_day'] = float(peak_day)
                    features['peak_day_activity_ratio'] = float(daily_counts[peak_day] / len(hist_timestamps))
                else:
                    features['peak_activity_day'] = 0.0
                    features['peak_day_activity_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Periodicity feature extraction failed: {str(e)}")
        
        return features
    
    async def _extract_temporal_patterns(self, timestamp: datetime, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract temporal behavior patterns."""
        features = {}
        
        try:
            # Session duration patterns
            session_durations = activity_data.get('session_durations', [])
            if session_durations:
                features['avg_session_duration'] = float(np.mean(session_durations))
                features['std_session_duration'] = float(np.std(session_durations))
                features['max_session_duration'] = float(np.max(session_durations))
                features['min_session_duration'] = float(np.min(session_durations))
                
                # Session duration consistency
                if np.mean(session_durations) > 0:
                    features['session_duration_consistency'] = float(np.std(session_durations) / np.mean(session_durations))
                else:
                    features['session_duration_consistency'] = 0.0
            else:
                features['avg_session_duration'] = 0.0
                features['std_session_duration'] = 0.0
                features['max_session_duration'] = 0.0
                features['min_session_duration'] = 0.0
                features['session_duration_consistency'] = 0.0
            
            # Response time patterns
            response_times = activity_data.get('response_times', [])
            if response_times:
                features['avg_response_time'] = float(np.mean(response_times))
                features['std_response_time'] = float(np.std(response_times))
                features['95th_response_time'] = float(np.percentile(response_times, 95))
                features['99th_response_time'] = float(np.percentile(response_times, 99))
            else:
                features['avg_response_time'] = 0.0
                features['std_response_time'] = 0.0
                features['95th_response_time'] = 0.0
                features['99th_response_time'] = 0.0
            
            # Idle time patterns
            idle_times = activity_data.get('idle_times', [])
            if idle_times:
                features['avg_idle_time'] = float(np.mean(idle_times))
                features['max_idle_time'] = float(np.max(idle_times))
                features['idle_time_variance'] = float(np.var(idle_times))
            else:
                features['avg_idle_time'] = 0.0
                features['max_idle_time'] = 0.0
                features['idle_time_variance'] = 0.0
            
            # Activity burst patterns
            activity_timestamps = activity_data.get('activity_timestamps', [])
            if activity_timestamps:
                burst_features = self._analyze_activity_bursts(activity_timestamps, timestamp)
                features.update(burst_features)
            
            # Temporal anomaly indicators
            anomaly_features = self._detect_temporal_anomalies(timestamp, activity_data)
            features.update(anomaly_features)
            
        except Exception as e:
            logger.error(f"Temporal pattern extraction failed: {str(e)}")
        
        return features
    
    async def _extract_window_features(self, timestamp: datetime, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract features over different time windows."""
        features = {}
        
        try:
            activity_history = activity_data.get('activity_history', [])
            
            if not activity_history:
                return features
            
            # Convert to DataFrame for easier manipulation
            df = pd.DataFrame(activity_history)
            if 'timestamp' not in df.columns:
                return features
            
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp')
            
            # Extract features for each time window
            for window in self.time_windows:
                window_start = timestamp - pd.Timedelta(window)
                window_data = df[df['timestamp'] >= window_start]
                
                if len(window_data) > 0:
                    # Activity count in window
                    features[f'activity_count_{window}'] = float(len(window_data))
                    
                    # Activity rate (activities per hour)
                    window_hours = pd.Timedelta(window).total_seconds() / 3600
                    features[f'activity_rate_{window}'] = float(len(window_data) / window_hours)
                    
                    # Numeric feature aggregations
                    numeric_columns = window_data.select_dtypes(include=[np.number]).columns
                    
                    for col in numeric_columns:
                        if col in window_data.columns:
                            for agg in self.aggregations:
                                if agg == 'count':
                                    features[f'{col}_{agg}_{window}'] = float(len(window_data[col].dropna()))
                                elif agg == 'mean':
                                    features[f'{col}_{agg}_{window}'] = float(window_data[col].mean())
                                elif agg == 'std':
                                    features[f'{col}_{agg}_{window}'] = float(window_data[col].std())
                                elif agg == 'min':
                                    features[f'{col}_{agg}_{window}'] = float(window_data[col].min())
                                elif agg == 'max':
                                    features[f'{col}_{agg}_{window}'] = float(window_data[col].max())
                    
                    # Trend analysis (linear regression slope)
                    if len(window_data) > 1:
                        time_numeric = (window_data['timestamp'] - window_data['timestamp'].min()).dt.total_seconds()
                        
                        for col in numeric_columns:
                            if col in window_data.columns and not window_data[col].isna().all():
                                try:
                                    slope = np.polyfit(time_numeric, window_data[col].fillna(0), 1)[0]
                                    features[f'{col}_trend_{window}'] = float(slope)
                                except:
                                    features[f'{col}_trend_{window}'] = 0.0
                else:
                    # No data in window
                    features[f'activity_count_{window}'] = 0.0
                    features[f'activity_rate_{window}'] = 0.0
            
        except Exception as e:
            logger.error(f"Window feature extraction failed: {str(e)}")
        
        return features
    
    async def _extract_seasonal_features(self, timestamp: datetime) -> Dict[str, float]:
        """Extract seasonal and calendar-based features."""
        features = {}
        
        try:
            # Holiday indicators (simplified - can be extended with actual holiday calendar)
            # New Year's Day
            features['is_new_years'] = float(timestamp.month == 1 and timestamp.day == 1)
            
            # Christmas period
            features['is_christmas_period'] = float(timestamp.month == 12 and timestamp.day >= 20)
            
            # Summer months (Northern Hemisphere)
            features['is_summer'] = float(timestamp.month in [6, 7, 8])
            
            # Winter months (Northern Hemisphere)
            features['is_winter'] = float(timestamp.month in [12, 1, 2])
            
            # Month-end period
            features['is_month_end'] = float(timestamp.day >= 28)
            
            # Quarter-end period
            features['is_quarter_end'] = float(timestamp.month in [3, 6, 9, 12] and timestamp.day >= 28)
            
            # Year-end period
            features['is_year_end'] = float(timestamp.month == 12 and timestamp.day >= 15)
            
            # Fiscal year features (assuming April-March fiscal year)
            fiscal_month = (timestamp.month + 8) % 12 + 1
            features['fiscal_month'] = float(fiscal_month)
            features['fiscal_quarter'] = float((fiscal_month - 1) // 3 + 1)
            
            # Days until weekend
            days_until_weekend = (5 - timestamp.weekday()) % 7
            features['days_until_weekend'] = float(days_until_weekend)
            
            # Days since weekend
            days_since_weekend = (timestamp.weekday() + 2) % 7
            features['days_since_weekend'] = float(days_since_weekend)
            
        except Exception as e:
            logger.error(f"Seasonal feature extraction failed: {str(e)}")
        
        return features
    
    def _detect_periodic_patterns(self, intervals: List[float]) -> Dict[str, float]:
        """Detect periodic patterns in activity intervals."""
        features = {}
        
        try:
            if len(intervals) < 10:  # Need sufficient data for pattern detection
                features['has_hourly_pattern'] = 0.0
                features['has_daily_pattern'] = 0.0
                features['has_weekly_pattern'] = 0.0
                return features
            
            # Convert intervals to frequency domain using FFT
            fft = np.fft.fft(intervals)
            freqs = np.fft.fftfreq(len(intervals))
            power_spectrum = np.abs(fft) ** 2
            
            # Define period ranges (in seconds)
            hourly_range = (3300, 3900)  # Around 1 hour (3600 seconds)
            daily_range = (82800, 90000)  # Around 1 day (86400 seconds)
            weekly_range = (604800 - 43200, 604800 + 43200)  # Around 1 week (604800 seconds)
            
            # Check for peaks in power spectrum at expected frequencies
            features['has_hourly_pattern'] = 0.0
            features['has_daily_pattern'] = 0.0
            features['has_weekly_pattern'] = 0.0
            
            # Simple pattern detection based on interval clustering
            interval_array = np.array(intervals)
            
            # Check for hourly patterns (intervals around 3600 seconds)
            hourly_mask = (interval_array >= hourly_range[0]) & (interval_array <= hourly_range[1])
            if np.sum(hourly_mask) > len(intervals) * 0.3:  # 30% threshold
                features['has_hourly_pattern'] = 1.0
            
            # Check for daily patterns (intervals around 86400 seconds)
            daily_mask = (interval_array >= daily_range[0]) & (interval_array <= daily_range[1])
            if np.sum(daily_mask) > len(intervals) * 0.2:  # 20% threshold
                features['has_daily_pattern'] = 1.0
            
            # Check for weekly patterns (intervals around 604800 seconds)
            weekly_mask = (interval_array >= weekly_range[0]) & (interval_array <= weekly_range[1])
            if np.sum(weekly_mask) > len(intervals) * 0.1:  # 10% threshold
                features['has_weekly_pattern'] = 1.0
            
        except Exception as e:
            logger.error(f"Periodic pattern detection failed: {str(e)}")
            features['has_hourly_pattern'] = 0.0
            features['has_daily_pattern'] = 0.0
            features['has_weekly_pattern'] = 0.0
        
        return features
    
    def _analyze_activity_bursts(self, activity_timestamps: List[str], current_timestamp: datetime) -> Dict[str, float]:
        """Analyze activity burst patterns."""
        features = {}
        
        try:
            if len(activity_timestamps) < 2:
                features['recent_burst_intensity'] = 0.0
                features['burst_frequency'] = 0.0
                features['time_since_last_burst'] = 0.0
                return features
            
            # Convert to datetime objects
            timestamps = [pd.to_datetime(ts) for ts in activity_timestamps]
            timestamps.sort()
            
            # Define burst criteria (activities within 5 minutes)
            burst_threshold = timedelta(minutes=5)
            
            # Identify bursts
            bursts = []
            current_burst = [timestamps[0]]
            
            for i in range(1, len(timestamps)):
                if timestamps[i] - timestamps[i-1] <= burst_threshold:
                    current_burst.append(timestamps[i])
                else:
                    if len(current_burst) > 1:
                        bursts.append(current_burst)
                    current_burst = [timestamps[i]]
            
            # Don't forget the last burst
            if len(current_burst) > 1:
                bursts.append(current_burst)
            
            # Calculate burst features
            if bursts:
                # Recent burst intensity (last 1 hour)
                recent_time = current_timestamp - timedelta(hours=1)
                recent_bursts = [b for b in bursts if b[-1] >= recent_time]
                
                if recent_bursts:
                    recent_activities = sum(len(b) for b in recent_bursts)
                    features['recent_burst_intensity'] = float(recent_activities)
                else:
                    features['recent_burst_intensity'] = 0.0
                
                # Overall burst frequency (bursts per day)
                if len(timestamps) > 1:
                    time_span = (timestamps[-1] - timestamps[0]).total_seconds() / 86400  # days
                    if time_span > 0:
                        features['burst_frequency'] = float(len(bursts) / time_span)
                    else:
                        features['burst_frequency'] = 0.0
                else:
                    features['burst_frequency'] = 0.0
                
                # Time since last burst
                last_burst_time = max(b[-1] for b in bursts)
                time_since_last_burst = (current_timestamp - last_burst_time).total_seconds()
                features['time_since_last_burst'] = float(time_since_last_burst)
            else:
                features['recent_burst_intensity'] = 0.0
                features['burst_frequency'] = 0.0
                features['time_since_last_burst'] = 0.0
            
        except Exception as e:
            logger.error(f"Activity burst analysis failed: {str(e)}")
            features['recent_burst_intensity'] = 0.0
            features['burst_frequency'] = 0.0
            features['time_since_last_burst'] = 0.0
        
        return features
    
    def _detect_temporal_anomalies(self, timestamp: datetime, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Detect temporal anomalies in activity patterns."""
        features = {}
        
        try:
            # Unusual time indicators
            features['is_very_early'] = float(timestamp.hour < 6)  # Before 6 AM
            features['is_very_late'] = float(timestamp.hour >= 22)  # After 10 PM
            features['is_midnight_hour'] = float(timestamp.hour == 0)  # Midnight hour
            
            # Weekend activity during business hours
            features['weekend_business_activity'] = float(
                timestamp.weekday() >= 5 and 9 <= timestamp.hour <= 17
            )
            
            # Holiday activity (simplified check)
            features['holiday_activity'] = float(
                (timestamp.month == 1 and timestamp.day == 1) or  # New Year
                (timestamp.month == 12 and timestamp.day == 25)    # Christmas
            )
            
            # Rapid successive activities
            activity_timestamps = activity_data.get('activity_timestamps', [])
            if len(activity_timestamps) > 1:
                recent_timestamps = [pd.to_datetime(ts) for ts in activity_timestamps[-10:]]  # Last 10 activities
                recent_timestamps.sort()
                
                # Check for activities within very short intervals (< 1 minute)
                rapid_activities = 0
                for i in range(1, len(recent_timestamps)):
                    if (recent_timestamps[i] - recent_timestamps[i-1]).total_seconds() < 60:
                        rapid_activities += 1
                
                features['rapid_activity_count'] = float(rapid_activities)
            else:
                features['rapid_activity_count'] = 0.0
            
            # Long idle periods followed by activity
            last_activity_time = activity_data.get('last_activity_time')
            if last_activity_time:
                last_activity = pd.to_datetime(last_activity_time)
                idle_duration = (timestamp - last_activity).total_seconds()
                
                # Long idle period (> 24 hours)
                features['long_idle_period'] = float(idle_duration > 86400)
                
                # Very long idle period (> 7 days)
                features['very_long_idle_period'] = float(idle_duration > 604800)
            else:
                features['long_idle_period'] = 0.0
                features['very_long_idle_period'] = 0.0
            
        except Exception as e:
            logger.error(f"Temporal anomaly detection failed: {str(e)}")
        
        return features
    
    def get_feature_names(self) -> List[str]:
        """Get list of all possible temporal feature names."""
        base_features = [
            # Basic time features
            'hour_of_day', 'hour_sin', 'hour_cos',
            'day_of_week', 'day_sin', 'day_cos',
            'day_of_month', 'day_of_month_sin', 'day_of_month_cos',
            'month_of_year', 'month_sin', 'month_cos',
            'week_of_year', 'week_sin', 'week_cos',
            'quarter', 'is_weekend', 'is_weekday',
            'is_business_hours', 'is_off_hours', 'time_category',
            'unix_timestamp',
            
            # Periodicity features
            'avg_activity_interval', 'std_activity_interval',
            'min_activity_interval', 'max_activity_interval',
            'activity_regularity', 'time_since_last_activity',
            'peak_activity_hour', 'peak_hour_activity_ratio',
            'peak_activity_day', 'peak_day_activity_ratio',
            'has_hourly_pattern', 'has_daily_pattern', 'has_weekly_pattern',
            
            # Temporal patterns
            'avg_session_duration', 'std_session_duration',
            'max_session_duration', 'min_session_duration',
            'session_duration_consistency',
            'avg_response_time', 'std_response_time',
            '95th_response_time', '99th_response_time',
            'avg_idle_time', 'max_idle_time', 'idle_time_variance',
            
            # Burst patterns
            'recent_burst_intensity', 'burst_frequency', 'time_since_last_burst',
            
            # Seasonal features
            'is_new_years', 'is_christmas_period', 'is_summer', 'is_winter',
            'is_month_end', 'is_quarter_end', 'is_year_end',
            'fiscal_month', 'fiscal_quarter',
            'days_until_weekend', 'days_since_weekend',
            
            # Anomaly indicators
            'is_very_early', 'is_very_late', 'is_midnight_hour',
            'weekend_business_activity', 'holiday_activity',
            'rapid_activity_count', 'long_idle_period', 'very_long_idle_period'
        ]
        
        # Add window-based features
        window_features = []
        for window in self.time_windows:
            window_features.extend([
                f'activity_count_{window}',
                f'activity_rate_{window}'
            ])
        
        return base_features + window_features
