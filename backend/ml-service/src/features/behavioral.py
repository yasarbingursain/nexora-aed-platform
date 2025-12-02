"""Behavioral feature extraction for entity activity analysis."""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class TenantIsolationError(Exception):
    """Raised when cross-tenant data is detected."""
    pass


from collections import Counter
import asyncio

from ..config import model_config

logger = logging.getLogger(__name__)


class BehavioralFeatureExtractor:
    """Extract behavioral features from entity activity data."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize behavioral feature extractor."""
        self.config = config or model_config['features']['behavioral']
        
        # Feature extraction settings
        self.activity_patterns = self.config.get('activity_patterns', True)
        self.access_patterns = self.config.get('access_patterns', True)
        self.resource_usage = self.config.get('resource_usage', True)
        
        # Feature cache for performance
        self.feature_cache = {}
        
    async def extract(self, activity_data: Dict[str, Any], tenant_id: str) -> Dict[str, float]:
        """Extract behavioral features from activity data with tenant isolation."""
        try:
            # CRITICAL: Validate tenant isolation
            if 'tenant_id' in activity_data:
                data_tenant = activity_data.get('tenant_id')
                if data_tenant != tenant_id:
                    raise TenantIsolationError(
                        f"Cross-tenant data rejected: expected {tenant_id}, got {data_tenant}"
                    )
            
            # Log tenant context for audit
            logger.info(f"Extracting features for tenant: {tenant_id}")
            
            features = {}
            features['tenant_id_hash'] = hash(tenant_id) % 1000000
            
            # Extract activity pattern features
            if self.activity_patterns:
                activity_features = await self._extract_activity_patterns(activity_data)
                features.update(activity_features)
            
            # Extract access pattern features
            if self.access_patterns:
                access_features = await self._extract_access_patterns(activity_data)
                features.update(access_features)
            
            # Extract resource usage features
            if self.resource_usage:
                resource_features = await self._extract_resource_usage(activity_data)
                features.update(resource_features)
            
            # Extract interaction patterns
            interaction_features = await self._extract_interaction_patterns(activity_data)
            features.update(interaction_features)
            
            # Extract anomaly indicators
            anomaly_features = await self._extract_anomaly_indicators(activity_data)
            features.update(anomaly_features)
            
            return features
            
        except TenantIsolationError:
            raise
        except Exception as e:
            logger.error(f"Feature extraction failed for tenant {tenant_id}: {str(e)}")
            return {}
    
    async def _extract_activity_patterns(self, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract activity pattern features."""
        features = {}
        
        try:
            # Activity frequency features
            activity_count = activity_data.get('activity_count', 0)
            features['activity_frequency'] = float(activity_count)
            
            # Activity type distribution
            activity_types = activity_data.get('activity_types', [])
            if activity_types:
                type_counts = Counter(activity_types)
                total_activities = sum(type_counts.values())
                
                # Entropy of activity types (diversity measure)
                if total_activities > 0:
                    probabilities = [count / total_activities for count in type_counts.values()]
                    entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
                    features['activity_type_entropy'] = float(entropy)
                    features['activity_type_diversity'] = float(len(type_counts))
                else:
                    features['activity_type_entropy'] = 0.0
                    features['activity_type_diversity'] = 0.0
                
                # Most common activity type ratio
                if type_counts:
                    max_count = max(type_counts.values())
                    features['dominant_activity_ratio'] = float(max_count / total_activities)
                else:
                    features['dominant_activity_ratio'] = 0.0
            else:
                features['activity_type_entropy'] = 0.0
                features['activity_type_diversity'] = 0.0
                features['dominant_activity_ratio'] = 0.0
            
            # Activity burst detection
            activity_timestamps = activity_data.get('activity_timestamps', [])
            if activity_timestamps:
                burst_features = self._detect_activity_bursts(activity_timestamps)
                features.update(burst_features)
            
            # Success/failure ratio
            successful_activities = activity_data.get('successful_activities', 0)
            failed_activities = activity_data.get('failed_activities', 0)
            total_attempts = successful_activities + failed_activities
            
            if total_attempts > 0:
                features['success_rate'] = float(successful_activities / total_attempts)
                features['failure_rate'] = float(failed_activities / total_attempts)
            else:
                features['success_rate'] = 0.0
                features['failure_rate'] = 0.0
            
            # Activity consistency (coefficient of variation)
            activity_intervals = activity_data.get('activity_intervals', [])
            if len(activity_intervals) > 1:
                mean_interval = np.mean(activity_intervals)
                std_interval = np.std(activity_intervals)
                if mean_interval > 0:
                    features['activity_consistency'] = float(std_interval / mean_interval)
                else:
                    features['activity_consistency'] = 0.0
            else:
                features['activity_consistency'] = 0.0
            
        except Exception as e:
            logger.error(f"Activity pattern extraction failed: {str(e)}")
        
        return features
    
    async def _extract_access_patterns(self, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract access pattern features."""
        features = {}
        
        try:
            # Resource access patterns
            accessed_resources = activity_data.get('accessed_resources', [])
            if accessed_resources:
                resource_counts = Counter(accessed_resources)
                total_accesses = sum(resource_counts.values())
                
                # Resource access diversity
                features['resource_access_diversity'] = float(len(resource_counts))
                
                # Resource access concentration (Gini coefficient)
                if total_accesses > 0:
                    sorted_counts = sorted(resource_counts.values())
                    n = len(sorted_counts)
                    cumsum = np.cumsum(sorted_counts)
                    gini = (n + 1 - 2 * sum((n + 1 - i) * count for i, count in enumerate(sorted_counts, 1))) / (n * total_accesses)
                    features['resource_access_concentration'] = float(gini)
                else:
                    features['resource_access_concentration'] = 0.0
                
                # Most accessed resource ratio
                if resource_counts:
                    max_access_count = max(resource_counts.values())
                    features['dominant_resource_ratio'] = float(max_access_count / total_accesses)
                else:
                    features['dominant_resource_ratio'] = 0.0
            else:
                features['resource_access_diversity'] = 0.0
                features['resource_access_concentration'] = 0.0
                features['dominant_resource_ratio'] = 0.0
            
            # Permission escalation indicators
            permission_changes = activity_data.get('permission_changes', [])
            features['permission_escalations'] = float(len([p for p in permission_changes if p.get('type') == 'escalation']))
            features['permission_reductions'] = float(len([p for p in permission_changes if p.get('type') == 'reduction']))
            
            # Unauthorized access attempts
            unauthorized_attempts = activity_data.get('unauthorized_attempts', 0)
            features['unauthorized_access_rate'] = float(unauthorized_attempts)
            
            # Access time patterns
            access_times = activity_data.get('access_times', [])
            if access_times:
                # Convert to hours for analysis
                hours = [pd.to_datetime(t).hour for t in access_times]
                
                # Business hours vs off-hours ratio
                business_hours = [h for h in hours if 9 <= h <= 17]
                off_hours = [h for h in hours if h < 9 or h > 17]
                
                total_accesses = len(hours)
                if total_accesses > 0:
                    features['business_hours_ratio'] = float(len(business_hours) / total_accesses)
                    features['off_hours_ratio'] = float(len(off_hours) / total_accesses)
                else:
                    features['business_hours_ratio'] = 0.0
                    features['off_hours_ratio'] = 0.0
                
                # Weekend access ratio
                weekends = [pd.to_datetime(t).weekday() for t in access_times if pd.to_datetime(t).weekday() >= 5]
                if total_accesses > 0:
                    features['weekend_access_ratio'] = float(len(weekends) / total_accesses)
                else:
                    features['weekend_access_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Access pattern extraction failed: {str(e)}")
        
        return features
    
    async def _extract_resource_usage(self, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract resource usage features."""
        features = {}
        
        try:
            # CPU usage statistics
            cpu_usage = activity_data.get('cpu_usage', [])
            if cpu_usage:
                features['cpu_usage_mean'] = float(np.mean(cpu_usage))
                features['cpu_usage_max'] = float(np.max(cpu_usage))
                features['cpu_usage_std'] = float(np.std(cpu_usage))
                features['cpu_usage_95th'] = float(np.percentile(cpu_usage, 95))
            else:
                features['cpu_usage_mean'] = 0.0
                features['cpu_usage_max'] = 0.0
                features['cpu_usage_std'] = 0.0
                features['cpu_usage_95th'] = 0.0
            
            # Memory usage statistics
            memory_usage = activity_data.get('memory_usage', [])
            if memory_usage:
                features['memory_usage_mean'] = float(np.mean(memory_usage))
                features['memory_usage_max'] = float(np.max(memory_usage))
                features['memory_usage_std'] = float(np.std(memory_usage))
                features['memory_usage_95th'] = float(np.percentile(memory_usage, 95))
            else:
                features['memory_usage_mean'] = 0.0
                features['memory_usage_max'] = 0.0
                features['memory_usage_std'] = 0.0
                features['memory_usage_95th'] = 0.0
            
            # Network usage statistics
            network_bytes_sent = activity_data.get('network_bytes_sent', [])
            network_bytes_received = activity_data.get('network_bytes_received', [])
            
            if network_bytes_sent:
                features['network_sent_mean'] = float(np.mean(network_bytes_sent))
                features['network_sent_max'] = float(np.max(network_bytes_sent))
                features['network_sent_total'] = float(np.sum(network_bytes_sent))
            else:
                features['network_sent_mean'] = 0.0
                features['network_sent_max'] = 0.0
                features['network_sent_total'] = 0.0
            
            if network_bytes_received:
                features['network_received_mean'] = float(np.mean(network_bytes_received))
                features['network_received_max'] = float(np.max(network_bytes_received))
                features['network_received_total'] = float(np.sum(network_bytes_received))
            else:
                features['network_received_mean'] = 0.0
                features['network_received_max'] = 0.0
                features['network_received_total'] = 0.0
            
            # Disk I/O statistics
            disk_reads = activity_data.get('disk_reads', [])
            disk_writes = activity_data.get('disk_writes', [])
            
            if disk_reads:
                features['disk_reads_mean'] = float(np.mean(disk_reads))
                features['disk_reads_total'] = float(np.sum(disk_reads))
            else:
                features['disk_reads_mean'] = 0.0
                features['disk_reads_total'] = 0.0
            
            if disk_writes:
                features['disk_writes_mean'] = float(np.mean(disk_writes))
                features['disk_writes_total'] = float(np.sum(disk_writes))
            else:
                features['disk_writes_mean'] = 0.0
                features['disk_writes_total'] = 0.0
            
            # Resource efficiency metrics
            if features['cpu_usage_mean'] > 0 and features['memory_usage_mean'] > 0:
                features['resource_efficiency'] = float(
                    (features['network_sent_total'] + features['network_received_total']) /
                    (features['cpu_usage_mean'] + features['memory_usage_mean'])
                )
            else:
                features['resource_efficiency'] = 0.0
            
        except Exception as e:
            logger.error(f"Resource usage extraction failed: {str(e)}")
        
        return features
    
    async def _extract_interaction_patterns(self, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract interaction pattern features."""
        features = {}
        
        try:
            # API call patterns
            api_calls = activity_data.get('api_calls', [])
            if api_calls:
                api_counts = Counter(api_calls)
                total_calls = sum(api_counts.values())
                
                features['api_call_diversity'] = float(len(api_counts))
                features['api_call_frequency'] = float(total_calls)
                
                # Most used API ratio
                if api_counts:
                    max_api_count = max(api_counts.values())
                    features['dominant_api_ratio'] = float(max_api_count / total_calls)
                else:
                    features['dominant_api_ratio'] = 0.0
            else:
                features['api_call_diversity'] = 0.0
                features['api_call_frequency'] = 0.0
                features['dominant_api_ratio'] = 0.0
            
            # Database interaction patterns
            db_queries = activity_data.get('database_queries', [])
            if db_queries:
                query_types = [q.get('type', 'unknown') for q in db_queries]
                query_counts = Counter(query_types)
                
                features['db_query_diversity'] = float(len(query_counts))
                features['db_query_frequency'] = float(len(db_queries))
                
                # Query type ratios
                total_queries = len(db_queries)
                features['select_query_ratio'] = float(query_counts.get('SELECT', 0) / total_queries)
                features['insert_query_ratio'] = float(query_counts.get('INSERT', 0) / total_queries)
                features['update_query_ratio'] = float(query_counts.get('UPDATE', 0) / total_queries)
                features['delete_query_ratio'] = float(query_counts.get('DELETE', 0) / total_queries)
            else:
                features['db_query_diversity'] = 0.0
                features['db_query_frequency'] = 0.0
                features['select_query_ratio'] = 0.0
                features['insert_query_ratio'] = 0.0
                features['update_query_ratio'] = 0.0
                features['delete_query_ratio'] = 0.0
            
            # File system interactions
            file_operations = activity_data.get('file_operations', [])
            if file_operations:
                operation_types = [op.get('type', 'unknown') for op in file_operations]
                operation_counts = Counter(operation_types)
                
                features['file_operation_diversity'] = float(len(operation_counts))
                features['file_operation_frequency'] = float(len(file_operations))
                
                # Operation type ratios
                total_operations = len(file_operations)
                features['file_read_ratio'] = float(operation_counts.get('read', 0) / total_operations)
                features['file_write_ratio'] = float(operation_counts.get('write', 0) / total_operations)
                features['file_delete_ratio'] = float(operation_counts.get('delete', 0) / total_operations)
            else:
                features['file_operation_diversity'] = 0.0
                features['file_operation_frequency'] = 0.0
                features['file_read_ratio'] = 0.0
                features['file_write_ratio'] = 0.0
                features['file_delete_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Interaction pattern extraction failed: {str(e)}")
        
        return features
    
    async def _extract_anomaly_indicators(self, activity_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract features that may indicate anomalous behavior."""
        features = {}
        
        try:
            # Error rate indicators
            error_count = activity_data.get('error_count', 0)
            total_operations = activity_data.get('total_operations', 1)
            features['error_rate'] = float(error_count / total_operations)
            
            # Retry patterns
            retry_count = activity_data.get('retry_count', 0)
            features['retry_rate'] = float(retry_count / total_operations)
            
            # Timeout indicators
            timeout_count = activity_data.get('timeout_count', 0)
            features['timeout_rate'] = float(timeout_count / total_operations)
            
            # Authentication failures
            auth_failures = activity_data.get('authentication_failures', 0)
            auth_attempts = activity_data.get('authentication_attempts', 1)
            features['auth_failure_rate'] = float(auth_failures / auth_attempts)
            
            # Privilege escalation attempts
            escalation_attempts = activity_data.get('privilege_escalation_attempts', 0)
            features['escalation_attempt_rate'] = float(escalation_attempts / total_operations)
            
            # Unusual timing indicators
            off_hours_activities = activity_data.get('off_hours_activities', 0)
            total_activities = activity_data.get('activity_count', 1)
            features['off_hours_activity_ratio'] = float(off_hours_activities / total_activities)
            
            # Data exfiltration indicators
            large_downloads = activity_data.get('large_downloads', 0)
            features['large_download_count'] = float(large_downloads)
            
            # Lateral movement indicators
            unique_hosts_accessed = activity_data.get('unique_hosts_accessed', 0)
            features['lateral_movement_indicator'] = float(unique_hosts_accessed)
            
            # Persistence indicators
            scheduled_tasks_created = activity_data.get('scheduled_tasks_created', 0)
            registry_modifications = activity_data.get('registry_modifications', 0)
            features['persistence_indicators'] = float(scheduled_tasks_created + registry_modifications)
            
        except Exception as e:
            logger.error(f"Anomaly indicator extraction failed: {str(e)}")
        
        return features
    
    def _detect_activity_bursts(self, timestamps: List[str]) -> Dict[str, float]:
        """Detect burst patterns in activity timestamps."""
        features = {}
        
        try:
            if len(timestamps) < 2:
                features['burst_count'] = 0.0
                features['max_burst_size'] = 0.0
                features['burst_intensity'] = 0.0
                return features
            
            # Convert timestamps to datetime objects
            dt_timestamps = [pd.to_datetime(ts) for ts in timestamps]
            dt_timestamps.sort()
            
            # Calculate intervals between activities
            intervals = [(dt_timestamps[i+1] - dt_timestamps[i]).total_seconds() 
                        for i in range(len(dt_timestamps)-1)]
            
            if not intervals:
                features['burst_count'] = 0.0
                features['max_burst_size'] = 0.0
                features['burst_intensity'] = 0.0
                return features
            
            # Define burst threshold (activities within 60 seconds)
            burst_threshold = 60.0
            
            # Detect bursts
            bursts = []
            current_burst = [0]  # Start with first activity
            
            for i, interval in enumerate(intervals):
                if interval <= burst_threshold:
                    current_burst.append(i + 1)
                else:
                    if len(current_burst) > 1:  # Only count as burst if more than 1 activity
                        bursts.append(current_burst)
                    current_burst = [i + 1]
            
            # Don't forget the last burst
            if len(current_burst) > 1:
                bursts.append(current_burst)
            
            # Calculate burst features
            features['burst_count'] = float(len(bursts))
            
            if bursts:
                burst_sizes = [len(burst) for burst in bursts]
                features['max_burst_size'] = float(max(burst_sizes))
                features['avg_burst_size'] = float(np.mean(burst_sizes))
                
                # Burst intensity (activities per minute during bursts)
                total_burst_activities = sum(burst_sizes)
                total_burst_time = sum(
                    (dt_timestamps[burst[-1]] - dt_timestamps[burst[0]]).total_seconds() / 60.0
                    for burst in bursts if len(burst) > 1
                )
                
                if total_burst_time > 0:
                    features['burst_intensity'] = float(total_burst_activities / total_burst_time)
                else:
                    features['burst_intensity'] = 0.0
            else:
                features['max_burst_size'] = 0.0
                features['avg_burst_size'] = 0.0
                features['burst_intensity'] = 0.0
            
        except Exception as e:
            logger.error(f"Burst detection failed: {str(e)}")
            features['burst_count'] = 0.0
            features['max_burst_size'] = 0.0
            features['burst_intensity'] = 0.0
        
        return features
    
    def get_feature_names(self) -> List[str]:
        """Get list of all possible feature names."""
        return [
            # Activity patterns
            'activity_frequency', 'activity_type_entropy', 'activity_type_diversity',
            'dominant_activity_ratio', 'success_rate', 'failure_rate', 'activity_consistency',
            'burst_count', 'max_burst_size', 'avg_burst_size', 'burst_intensity',
            
            # Access patterns
            'resource_access_diversity', 'resource_access_concentration', 'dominant_resource_ratio',
            'permission_escalations', 'permission_reductions', 'unauthorized_access_rate',
            'business_hours_ratio', 'off_hours_ratio', 'weekend_access_ratio',
            
            # Resource usage
            'cpu_usage_mean', 'cpu_usage_max', 'cpu_usage_std', 'cpu_usage_95th',
            'memory_usage_mean', 'memory_usage_max', 'memory_usage_std', 'memory_usage_95th',
            'network_sent_mean', 'network_sent_max', 'network_sent_total',
            'network_received_mean', 'network_received_max', 'network_received_total',
            'disk_reads_mean', 'disk_reads_total', 'disk_writes_mean', 'disk_writes_total',
            'resource_efficiency',
            
            # Interaction patterns
            'api_call_diversity', 'api_call_frequency', 'dominant_api_ratio',
            'db_query_diversity', 'db_query_frequency',
            'select_query_ratio', 'insert_query_ratio', 'update_query_ratio', 'delete_query_ratio',
            'file_operation_diversity', 'file_operation_frequency',
            'file_read_ratio', 'file_write_ratio', 'file_delete_ratio',
            
            # Anomaly indicators
            'error_rate', 'retry_rate', 'timeout_rate', 'auth_failure_rate',
            'escalation_attempt_rate', 'off_hours_activity_ratio', 'large_download_count',
            'lateral_movement_indicator', 'persistence_indicators'
        ]
