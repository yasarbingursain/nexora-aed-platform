"""Network feature extraction for network-based analysis."""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
import logging
from collections import Counter, defaultdict
import ipaddress
import asyncio
import re

from ..config import model_config

logger = logging.getLogger(__name__)


class TenantIsolationError(Exception):
    """Raised when cross-tenant data is detected."""
    pass


class NetworkFeatureExtractor:
    """Extract network-based features from entity activity data."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize network feature extractor."""
        self.config = config or model_config['features']['network']
        
        # Feature extraction settings
        self.connection_patterns = self.config.get('connection_patterns', True)
        self.traffic_analysis = self.config.get('traffic_analysis', True)
        self.geo_location = self.config.get('geo_location', True)
        
        # Known private IP ranges
        self.private_ranges = [
            ipaddress.IPv4Network('10.0.0.0/8'),
            ipaddress.IPv4Network('172.16.0.0/12'),
            ipaddress.IPv4Network('192.168.0.0/16'),
            ipaddress.IPv4Network('127.0.0.0/8')
        ]
        
        # Feature cache
        self.feature_cache = {}
        
    async def extract(self, network_data: Dict[str, Any], tenant_id: str) -> Dict[str, float]:
        """Extract network features from network activity data with tenant isolation."""
        try:
            # CRITICAL: Validate tenant isolation
            if 'tenant_id' in network_data:
                data_tenant = network_data.get('tenant_id')
                if data_tenant != tenant_id:
                    raise TenantIsolationError(
                        f"Cross-tenant data rejected: expected {tenant_id}, got {data_tenant}"
                    )
            
            # Log tenant context for audit
            logger.info(f"Extracting network features for tenant: {tenant_id}")
            
            features = {}
            features['tenant_id_hash'] = hash(tenant_id) % 1000000
            
            # Extract connection pattern features
            if self.connection_patterns:
                connection_features = await self._extract_connection_patterns(network_data)
                features.update(connection_features)
            
            # Extract traffic analysis features
            if self.traffic_analysis:
                traffic_features = await self._extract_traffic_analysis(network_data)
                features.update(traffic_features)
            
            # Extract geographic features
            if self.geo_location:
                geo_features = await self._extract_geographic_features(network_data)
                features.update(geo_features)
            
            # Extract protocol features
            protocol_features = await self._extract_protocol_features(network_data)
            features.update(protocol_features)
            
            # Extract security features
            security_features = await self._extract_security_features(network_data)
            features.update(security_features)
            
            return features
            
        except TenantIsolationError:
            raise
        except Exception as e:
            logger.error(f"Network feature extraction failed for tenant {tenant_id}: {str(e)}")
            return {}
    
    async def _extract_connection_patterns(self, network_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract connection pattern features."""
        features = {}
        
        try:
            # Source IP analysis
            source_ips = network_data.get('source_ips', [])
            if source_ips:
                ip_counts = Counter(source_ips)
                unique_ips = len(ip_counts)
                total_connections = sum(ip_counts.values())
                
                features['unique_source_ips'] = float(unique_ips)
                features['total_connections'] = float(total_connections)
                
                # IP diversity (entropy)
                if total_connections > 0:
                    probabilities = [count / total_connections for count in ip_counts.values()]
                    entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
                    features['source_ip_entropy'] = float(entropy)
                else:
                    features['source_ip_entropy'] = 0.0
                
                # Dominant IP ratio
                if ip_counts:
                    max_ip_count = max(ip_counts.values())
                    features['dominant_ip_ratio'] = float(max_ip_count / total_connections)
                else:
                    features['dominant_ip_ratio'] = 0.0
                
                # Private vs public IP analysis
                private_ips = 0
                public_ips = 0
                
                for ip in source_ips:
                    try:
                        ip_obj = ipaddress.IPv4Address(ip)
                        if any(ip_obj in private_range for private_range in self.private_ranges):
                            private_ips += 1
                        else:
                            public_ips += 1
                    except:
                        pass  # Invalid IP format
                
                total_valid_ips = private_ips + public_ips
                if total_valid_ips > 0:
                    features['private_ip_ratio'] = float(private_ips / total_valid_ips)
                    features['public_ip_ratio'] = float(public_ips / total_valid_ips)
                else:
                    features['private_ip_ratio'] = 0.0
                    features['public_ip_ratio'] = 0.0
            else:
                features['unique_source_ips'] = 0.0
                features['total_connections'] = 0.0
                features['source_ip_entropy'] = 0.0
                features['dominant_ip_ratio'] = 0.0
                features['private_ip_ratio'] = 0.0
                features['public_ip_ratio'] = 0.0
            
            # Destination analysis
            destinations = network_data.get('destinations', [])
            if destinations:
                dest_counts = Counter(destinations)
                features['unique_destinations'] = float(len(dest_counts))
                
                # Destination diversity
                total_dest_connections = sum(dest_counts.values())
                if total_dest_connections > 0:
                    dest_probabilities = [count / total_dest_connections for count in dest_counts.values()]
                    dest_entropy = -sum(p * np.log2(p) for p in dest_probabilities if p > 0)
                    features['destination_entropy'] = float(dest_entropy)
                else:
                    features['destination_entropy'] = 0.0
            else:
                features['unique_destinations'] = 0.0
                features['destination_entropy'] = 0.0
            
            # Port analysis
            source_ports = network_data.get('source_ports', [])
            dest_ports = network_data.get('destination_ports', [])
            
            if source_ports:
                features['unique_source_ports'] = float(len(set(source_ports)))
                
                # Well-known port usage
                well_known_ports = [p for p in source_ports if p <= 1024]
                features['well_known_port_ratio'] = float(len(well_known_ports) / len(source_ports))
            else:
                features['unique_source_ports'] = 0.0
                features['well_known_port_ratio'] = 0.0
            
            if dest_ports:
                features['unique_dest_ports'] = float(len(set(dest_ports)))
                
                # Common service ports
                common_services = {80: 'http', 443: 'https', 22: 'ssh', 21: 'ftp', 25: 'smtp', 53: 'dns'}
                service_usage = defaultdict(int)
                
                for port in dest_ports:
                    if port in common_services:
                        service_usage[common_services[port]] += 1
                
                total_dest_ports = len(dest_ports)
                features['http_port_ratio'] = float(service_usage['http'] / total_dest_ports)
                features['https_port_ratio'] = float(service_usage['https'] / total_dest_ports)
                features['ssh_port_ratio'] = float(service_usage['ssh'] / total_dest_ports)
                features['ftp_port_ratio'] = float(service_usage['ftp'] / total_dest_ports)
                features['smtp_port_ratio'] = float(service_usage['smtp'] / total_dest_ports)
                features['dns_port_ratio'] = float(service_usage['dns'] / total_dest_ports)
            else:
                features['unique_dest_ports'] = 0.0
                features['http_port_ratio'] = 0.0
                features['https_port_ratio'] = 0.0
                features['ssh_port_ratio'] = 0.0
                features['ftp_port_ratio'] = 0.0
                features['smtp_port_ratio'] = 0.0
                features['dns_port_ratio'] = 0.0
            
            # Connection duration analysis
            connection_durations = network_data.get('connection_durations', [])
            if connection_durations:
                features['avg_connection_duration'] = float(np.mean(connection_durations))
                features['max_connection_duration'] = float(np.max(connection_durations))
                features['std_connection_duration'] = float(np.std(connection_durations))
                features['median_connection_duration'] = float(np.median(connection_durations))
                
                # Short vs long connections
                short_connections = [d for d in connection_durations if d < 60]  # < 1 minute
                long_connections = [d for d in connection_durations if d > 3600]  # > 1 hour
                
                total_connections = len(connection_durations)
                features['short_connection_ratio'] = float(len(short_connections) / total_connections)
                features['long_connection_ratio'] = float(len(long_connections) / total_connections)
            else:
                features['avg_connection_duration'] = 0.0
                features['max_connection_duration'] = 0.0
                features['std_connection_duration'] = 0.0
                features['median_connection_duration'] = 0.0
                features['short_connection_ratio'] = 0.0
                features['long_connection_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Connection pattern extraction failed: {str(e)}")
        
        return features
    
    async def _extract_traffic_analysis(self, network_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract traffic analysis features."""
        features = {}
        
        try:
            # Bytes transferred analysis
            bytes_sent = network_data.get('bytes_sent', [])
            bytes_received = network_data.get('bytes_received', [])
            
            if bytes_sent:
                features['total_bytes_sent'] = float(sum(bytes_sent))
                features['avg_bytes_sent'] = float(np.mean(bytes_sent))
                features['max_bytes_sent'] = float(np.max(bytes_sent))
                features['std_bytes_sent'] = float(np.std(bytes_sent))
                
                # Large transfer detection
                large_uploads = [b for b in bytes_sent if b > 1024 * 1024]  # > 1MB
                features['large_upload_count'] = float(len(large_uploads))
                features['large_upload_ratio'] = float(len(large_uploads) / len(bytes_sent))
            else:
                features['total_bytes_sent'] = 0.0
                features['avg_bytes_sent'] = 0.0
                features['max_bytes_sent'] = 0.0
                features['std_bytes_sent'] = 0.0
                features['large_upload_count'] = 0.0
                features['large_upload_ratio'] = 0.0
            
            if bytes_received:
                features['total_bytes_received'] = float(sum(bytes_received))
                features['avg_bytes_received'] = float(np.mean(bytes_received))
                features['max_bytes_received'] = float(np.max(bytes_received))
                features['std_bytes_received'] = float(np.std(bytes_received))
                
                # Large download detection
                large_downloads = [b for b in bytes_received if b > 1024 * 1024]  # > 1MB
                features['large_download_count'] = float(len(large_downloads))
                features['large_download_ratio'] = float(len(large_downloads) / len(bytes_received))
            else:
                features['total_bytes_received'] = 0.0
                features['avg_bytes_received'] = 0.0
                features['max_bytes_received'] = 0.0
                features['std_bytes_received'] = 0.0
                features['large_download_count'] = 0.0
                features['large_download_ratio'] = 0.0
            
            # Traffic ratio analysis
            total_sent = features['total_bytes_sent']
            total_received = features['total_bytes_received']
            total_traffic = total_sent + total_received
            
            if total_traffic > 0:
                features['upload_download_ratio'] = float(total_sent / total_received) if total_received > 0 else float('inf')
                features['upload_traffic_ratio'] = float(total_sent / total_traffic)
                features['download_traffic_ratio'] = float(total_received / total_traffic)
            else:
                features['upload_download_ratio'] = 0.0
                features['upload_traffic_ratio'] = 0.0
                features['download_traffic_ratio'] = 0.0
            
            # Packet analysis
            packets_sent = network_data.get('packets_sent', [])
            packets_received = network_data.get('packets_received', [])
            
            if packets_sent:
                features['total_packets_sent'] = float(sum(packets_sent))
                features['avg_packets_sent'] = float(np.mean(packets_sent))
                
                # Average packet size
                if len(packets_sent) == len(bytes_sent) and len(packets_sent) > 0:
                    avg_packet_sizes = [b / p if p > 0 else 0 for b, p in zip(bytes_sent, packets_sent)]
                    features['avg_packet_size_sent'] = float(np.mean(avg_packet_sizes))
                else:
                    features['avg_packet_size_sent'] = 0.0
            else:
                features['total_packets_sent'] = 0.0
                features['avg_packets_sent'] = 0.0
                features['avg_packet_size_sent'] = 0.0
            
            if packets_received:
                features['total_packets_received'] = float(sum(packets_received))
                features['avg_packets_received'] = float(np.mean(packets_received))
                
                # Average packet size
                if len(packets_received) == len(bytes_received) and len(packets_received) > 0:
                    avg_packet_sizes = [b / p if p > 0 else 0 for b, p in zip(bytes_received, packets_received)]
                    features['avg_packet_size_received'] = float(np.mean(avg_packet_sizes))
                else:
                    features['avg_packet_size_received'] = 0.0
            else:
                features['total_packets_received'] = 0.0
                features['avg_packets_received'] = 0.0
                features['avg_packet_size_received'] = 0.0
            
            # Bandwidth utilization
            connection_durations = network_data.get('connection_durations', [])
            if connection_durations and total_traffic > 0:
                total_duration = sum(connection_durations)
                if total_duration > 0:
                    features['avg_bandwidth_utilization'] = float(total_traffic / total_duration)  # bytes per second
                else:
                    features['avg_bandwidth_utilization'] = 0.0
            else:
                features['avg_bandwidth_utilization'] = 0.0
            
        except Exception as e:
            logger.error(f"Traffic analysis extraction failed: {str(e)}")
        
        return features
    
    async def _extract_geographic_features(self, network_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract geographic and location-based features."""
        features = {}
        
        try:
            # Geographic locations
            geo_locations = network_data.get('geo_locations', [])
            if geo_locations:
                location_counts = Counter(geo_locations)
                features['unique_geo_locations'] = float(len(location_counts))
                
                # Geographic diversity
                total_geo_connections = sum(location_counts.values())
                if total_geo_connections > 0:
                    geo_probabilities = [count / total_geo_connections for count in location_counts.values()]
                    geo_entropy = -sum(p * np.log2(p) for p in geo_probabilities if p > 0)
                    features['geo_location_entropy'] = float(geo_entropy)
                else:
                    features['geo_location_entropy'] = 0.0
                
                # Dominant location ratio
                if location_counts:
                    max_location_count = max(location_counts.values())
                    features['dominant_location_ratio'] = float(max_location_count / total_geo_connections)
                else:
                    features['dominant_location_ratio'] = 0.0
                
                # Country analysis
                countries = [loc.split(',')[-1].strip() if ',' in loc else loc for loc in geo_locations]
                country_counts = Counter(countries)
                features['unique_countries'] = float(len(country_counts))
                
                # Suspicious location indicators
                suspicious_countries = ['Unknown', 'Anonymous', 'Tor', 'VPN']
                suspicious_count = sum(country_counts.get(country, 0) for country in suspicious_countries)
                features['suspicious_location_ratio'] = float(suspicious_count / len(geo_locations))
            else:
                features['unique_geo_locations'] = 0.0
                features['geo_location_entropy'] = 0.0
                features['dominant_location_ratio'] = 0.0
                features['unique_countries'] = 0.0
                features['suspicious_location_ratio'] = 0.0
            
            # Time zone analysis
            time_zones = network_data.get('time_zones', [])
            if time_zones:
                tz_counts = Counter(time_zones)
                features['unique_time_zones'] = float(len(tz_counts))
                
                # Cross-timezone activity
                if len(tz_counts) > 1:
                    features['cross_timezone_activity'] = 1.0
                else:
                    features['cross_timezone_activity'] = 0.0
            else:
                features['unique_time_zones'] = 0.0
                features['cross_timezone_activity'] = 0.0
            
            # ISP analysis
            isps = network_data.get('isps', [])
            if isps:
                isp_counts = Counter(isps)
                features['unique_isps'] = float(len(isp_counts))
                
                # VPN/Proxy detection (simplified)
                vpn_keywords = ['vpn', 'proxy', 'tor', 'anonymous', 'private']
                vpn_count = 0
                
                for isp in isps:
                    if any(keyword in isp.lower() for keyword in vpn_keywords):
                        vpn_count += 1
                
                features['vpn_proxy_ratio'] = float(vpn_count / len(isps))
            else:
                features['unique_isps'] = 0.0
                features['vpn_proxy_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Geographic feature extraction failed: {str(e)}")
        
        return features
    
    async def _extract_protocol_features(self, network_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract protocol-based features."""
        features = {}
        
        try:
            # Protocol distribution
            protocols = network_data.get('protocols', [])
            if protocols:
                protocol_counts = Counter(protocols)
                features['unique_protocols'] = float(len(protocol_counts))
                
                total_protocol_connections = sum(protocol_counts.values())
                
                # Common protocol ratios
                features['tcp_ratio'] = float(protocol_counts.get('TCP', 0) / total_protocol_connections)
                features['udp_ratio'] = float(protocol_counts.get('UDP', 0) / total_protocol_connections)
                features['icmp_ratio'] = float(protocol_counts.get('ICMP', 0) / total_protocol_connections)
                features['http_ratio'] = float(protocol_counts.get('HTTP', 0) / total_protocol_connections)
                features['https_ratio'] = float(protocol_counts.get('HTTPS', 0) / total_protocol_connections)
                features['dns_ratio'] = float(protocol_counts.get('DNS', 0) / total_protocol_connections)
                features['ssh_ratio'] = float(protocol_counts.get('SSH', 0) / total_protocol_connections)
                
                # Encrypted vs unencrypted traffic
                encrypted_protocols = ['HTTPS', 'SSH', 'TLS', 'SSL']
                encrypted_count = sum(protocol_counts.get(proto, 0) for proto in encrypted_protocols)
                features['encrypted_traffic_ratio'] = float(encrypted_count / total_protocol_connections)
            else:
                features['unique_protocols'] = 0.0
                features['tcp_ratio'] = 0.0
                features['udp_ratio'] = 0.0
                features['icmp_ratio'] = 0.0
                features['http_ratio'] = 0.0
                features['https_ratio'] = 0.0
                features['dns_ratio'] = 0.0
                features['ssh_ratio'] = 0.0
                features['encrypted_traffic_ratio'] = 0.0
            
            # User agent analysis
            user_agents = network_data.get('user_agents', [])
            if user_agents:
                ua_counts = Counter(user_agents)
                features['unique_user_agents'] = float(len(ua_counts))
                
                # Browser detection
                browser_patterns = {
                    'chrome': r'Chrome',
                    'firefox': r'Firefox',
                    'safari': r'Safari',
                    'edge': r'Edge',
                    'bot': r'bot|crawler|spider'
                }
                
                browser_counts = defaultdict(int)
                for ua in user_agents:
                    for browser, pattern in browser_patterns.items():
                        if re.search(pattern, ua, re.IGNORECASE):
                            browser_counts[browser] += 1
                            break
                
                total_ua = len(user_agents)
                features['chrome_ratio'] = float(browser_counts['chrome'] / total_ua)
                features['firefox_ratio'] = float(browser_counts['firefox'] / total_ua)
                features['safari_ratio'] = float(browser_counts['safari'] / total_ua)
                features['edge_ratio'] = float(browser_counts['edge'] / total_ua)
                features['bot_ratio'] = float(browser_counts['bot'] / total_ua)
            else:
                features['unique_user_agents'] = 0.0
                features['chrome_ratio'] = 0.0
                features['firefox_ratio'] = 0.0
                features['safari_ratio'] = 0.0
                features['edge_ratio'] = 0.0
                features['bot_ratio'] = 0.0
            
        except Exception as e:
            logger.error(f"Protocol feature extraction failed: {str(e)}")
        
        return features
    
    async def _extract_security_features(self, network_data: Dict[str, Any]) -> Dict[str, float]:
        """Extract security-related network features."""
        features = {}
        
        try:
            # Failed connection attempts
            failed_connections = network_data.get('failed_connections', 0)
            total_attempts = network_data.get('total_connection_attempts', 1)
            features['connection_failure_rate'] = float(failed_connections / total_attempts)
            
            # Port scanning indicators
            unique_dest_ports = network_data.get('unique_destination_ports', 0)
            features['port_scan_indicator'] = float(unique_dest_ports > 100)  # Threshold-based
            
            # Suspicious port usage
            suspicious_ports = network_data.get('suspicious_ports', [])
            if suspicious_ports:
                features['suspicious_port_count'] = float(len(suspicious_ports))
            else:
                features['suspicious_port_count'] = 0.0
            
            # DGA (Domain Generation Algorithm) indicators
            domains = network_data.get('domains', [])
            if domains:
                # Simple DGA detection based on domain characteristics
                suspicious_domains = 0
                for domain in domains:
                    # Check for random-looking domains
                    if len(domain) > 20 or domain.count('.') > 3:
                        suspicious_domains += 1
                
                features['dga_indicator'] = float(suspicious_domains / len(domains))
            else:
                features['dga_indicator'] = 0.0
            
            # Beaconing indicators
            connection_intervals = network_data.get('connection_intervals', [])
            if len(connection_intervals) > 5:
                # Check for regular intervals (potential beaconing)
                interval_std = np.std(connection_intervals)
                interval_mean = np.mean(connection_intervals)
                
                if interval_mean > 0:
                    regularity = interval_std / interval_mean
                    features['beaconing_indicator'] = float(regularity < 0.1)  # Very regular intervals
                else:
                    features['beaconing_indicator'] = 0.0
            else:
                features['beaconing_indicator'] = 0.0
            
            # Data exfiltration indicators
            large_outbound_transfers = network_data.get('large_outbound_transfers', 0)
            features['data_exfiltration_indicator'] = float(large_outbound_transfers)
            
            # Lateral movement indicators
            internal_connections = network_data.get('internal_connections', 0)
            external_connections = network_data.get('external_connections', 0)
            total_connections = internal_connections + external_connections
            
            if total_connections > 0:
                features['internal_connection_ratio'] = float(internal_connections / total_connections)
                features['lateral_movement_indicator'] = float(internal_connections > 10)  # Threshold-based
            else:
                features['internal_connection_ratio'] = 0.0
                features['lateral_movement_indicator'] = 0.0
            
            # Tor/anonymization indicators
            tor_connections = network_data.get('tor_connections', 0)
            features['tor_usage_indicator'] = float(tor_connections > 0)
            
            # DNS tunneling indicators
            dns_queries = network_data.get('dns_queries', [])
            if dns_queries:
                # Check for unusually long DNS queries (potential tunneling)
                long_queries = [q for q in dns_queries if len(q) > 100]
                features['dns_tunneling_indicator'] = float(len(long_queries) / len(dns_queries))
            else:
                features['dns_tunneling_indicator'] = 0.0
            
        except Exception as e:
            logger.error(f"Security feature extraction failed: {str(e)}")
        
        return features
    
    def get_feature_names(self) -> List[str]:
        """Get list of all possible network feature names."""
        return [
            # Connection patterns
            'unique_source_ips', 'total_connections', 'source_ip_entropy',
            'dominant_ip_ratio', 'private_ip_ratio', 'public_ip_ratio',
            'unique_destinations', 'destination_entropy',
            'unique_source_ports', 'well_known_port_ratio', 'unique_dest_ports',
            'http_port_ratio', 'https_port_ratio', 'ssh_port_ratio',
            'ftp_port_ratio', 'smtp_port_ratio', 'dns_port_ratio',
            'avg_connection_duration', 'max_connection_duration',
            'std_connection_duration', 'median_connection_duration',
            'short_connection_ratio', 'long_connection_ratio',
            
            # Traffic analysis
            'total_bytes_sent', 'avg_bytes_sent', 'max_bytes_sent', 'std_bytes_sent',
            'large_upload_count', 'large_upload_ratio',
            'total_bytes_received', 'avg_bytes_received', 'max_bytes_received', 'std_bytes_received',
            'large_download_count', 'large_download_ratio',
            'upload_download_ratio', 'upload_traffic_ratio', 'download_traffic_ratio',
            'total_packets_sent', 'avg_packets_sent', 'avg_packet_size_sent',
            'total_packets_received', 'avg_packets_received', 'avg_packet_size_received',
            'avg_bandwidth_utilization',
            
            # Geographic features
            'unique_geo_locations', 'geo_location_entropy', 'dominant_location_ratio',
            'unique_countries', 'suspicious_location_ratio',
            'unique_time_zones', 'cross_timezone_activity',
            'unique_isps', 'vpn_proxy_ratio',
            
            # Protocol features
            'unique_protocols', 'tcp_ratio', 'udp_ratio', 'icmp_ratio',
            'http_ratio', 'https_ratio', 'dns_ratio', 'ssh_ratio',
            'encrypted_traffic_ratio',
            'unique_user_agents', 'chrome_ratio', 'firefox_ratio',
            'safari_ratio', 'edge_ratio', 'bot_ratio',
            
            # Security features
            'connection_failure_rate', 'port_scan_indicator', 'suspicious_port_count',
            'dga_indicator', 'beaconing_indicator', 'data_exfiltration_indicator',
            'internal_connection_ratio', 'lateral_movement_indicator',
            'tor_usage_indicator', 'dns_tunneling_indicator'
        ]
