# Nexora ML Service

Advanced ML-based threat detection and entity morphing detection service for the Nexora Autonomous Entity Defense (AED) Platform.

## 🎯 Overview

The Nexora ML Service provides enterprise-grade machine learning capabilities for:

- **Anomaly Detection**: Multi-algorithm approach using Isolation Forest, One-Class SVM, and Autoencoders
- **Entity Morphing Detection**: Identify when entities change their behavioral patterns
- **Behavioral Drift Detection**: Monitor gradual changes in entity behavior over time
- **Feature Engineering**: Extract behavioral, temporal, and network features
- **Explainable AI**: Comprehensive explanations for all predictions
- **Real-time Processing**: High-throughput prediction API
- **Model Management**: Training, evaluation, and deployment pipelines

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   FastAPI       │    │   Ensemble      │    │   Feature       │
│   Endpoints     │────│   Models        │────│   Extractors    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Explainability │              │
         └──────────────│     Engine      │──────────────┘
                        └─────────────────┘
                                 │
                    ┌─────────────────────────────┐
                    │      MLflow Tracking       │
                    └─────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Docker & Docker Compose
- 8GB+ RAM (for ML models)

### Local Development

1. **Clone and Setup**
   ```bash
   cd backend/ml-service
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Run Locally**
   ```bash
   python main.py
   ```

3. **Access Services**
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health
   - Metrics: http://localhost:8000/health/metrics

### Docker Deployment

1. **Start All Services**
   ```bash
   docker-compose up -d
   ```

2. **Access Services**
   - ML Service API: http://localhost:8000
   - MLflow UI: http://localhost:5000
   - Grafana Dashboard: http://localhost:3000 (admin/admin)
   - Prometheus: http://localhost:9090

3. **Stop Services**
   ```bash
   docker-compose down
   ```

## 📊 API Endpoints

### Health & Monitoring
- `GET /health/` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics` - Prometheus metrics

### Prediction
- `POST /predict/anomaly` - Batch anomaly detection
- `POST /predict/single` - Single entity prediction
- `GET /predict/status/{request_id}` - Async prediction status

### Training
- `POST /train/start` - Start model training
- `GET /train/status/{job_id}` - Training job status
- `POST /train/stop/{job_id}` - Stop training job
- `GET /train/models` - List trained models

## 🤖 ML Models

### Anomaly Detection Models

1. **Isolation Forest**
   - Unsupervised anomaly detection
   - Fast training and prediction
   - Good for high-dimensional data

2. **One-Class SVM**
   - Support vector machine approach
   - Robust to outliers
   - Configurable kernel functions

3. **Autoencoder**
   - Deep learning approach
   - Reconstruction error-based detection
   - Captures complex patterns

4. **Ensemble Model**
   - Combines all three models
   - Weighted voting strategy
   - Higher accuracy and robustness

### Entity Morphing Detection

- **Behavioral Baseline Comparison**: Compare current behavior to established baselines
- **Similarity Analysis**: Cosine similarity and distance metrics
- **Pattern Recognition**: Identify morphing types (activity, network, temporal)

### Behavioral Drift Detection

- **Statistical Tests**: T-tests and KS-tests for distribution changes
- **Distance-based Methods**: Euclidean distance analysis
- **Sliding Window Analysis**: Monitor changes over time

## 🔧 Configuration

### Environment Variables

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Model Configuration
MODEL_CONFIG_PATH=src/config/model_config.yaml
MODEL_STORAGE_PATH=models/

# MLflow Configuration
MLFLOW_TRACKING_URI=sqlite:///mlflow.db
MLFLOW_EXPERIMENT_NAME=nexora-threat-detection

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/nexora
REDIS_URL=redis://localhost:6379

# Monitoring
PROMETHEUS_PORT=9090
LOG_LEVEL=INFO
```

### Model Configuration

Edit `src/config/model_config.yaml` to customize:

- Model hyperparameters
- Feature extraction settings
- Thresholds and alerts
- Training configuration

## 📈 Features

### Behavioral Features
- Activity patterns and frequency
- Access patterns and permissions
- Resource usage metrics
- Error rates and retry patterns

### Temporal Features
- Time-based patterns (hour, day, week)
- Seasonality and periodicity
- Activity bursts and intervals
- Business hours analysis

### Network Features
- Connection patterns and diversity
- Traffic analysis (bytes, packets)
- Geographic distribution
- Protocol usage and security indicators

## 🔍 Explainable AI

Every prediction includes:

- **Feature Importance**: Which features contributed most to the decision
- **Decision Factors**: Primary and secondary factors
- **Confidence Analysis**: Reliability assessment
- **Risk Assessment**: Impact and urgency evaluation
- **Recommendations**: Actionable next steps

## 📊 Monitoring & Metrics

### Performance Metrics
- Prediction latency (P95, P99)
- Throughput (entities/second)
- Error rates by type
- Model accuracy and drift

### Business Metrics
- Anomaly detection rate
- False positive rate
- Model confidence distribution
- Feature importance trends

## 🧪 Testing

### Unit Tests
```bash
pytest src/tests/unit/ -v
```

### Integration Tests
```bash
pytest src/tests/integration/ -v
```

### Load Testing
```bash
# Install k6 or artillery
k6 run tests/load/prediction_load_test.js
```

## 🚀 Deployment

### Kubernetes

1. **Build and Push Image**
   ```bash
   docker build -t nexora/ml-service:latest .
   docker push nexora/ml-service:latest
   ```

2. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/
   ```

### Production Considerations

- **Scaling**: Use HPA based on CPU/memory or custom metrics
- **Monitoring**: Integrate with Prometheus/Grafana
- **Logging**: Structured logging with correlation IDs
- **Security**: Network policies, RBAC, secret management
- **Backup**: Model artifacts and training data

## 🔒 Security

- **Authentication**: API key-based authentication
- **Authorization**: Role-based access control
- **Data Privacy**: No PII in logs or metrics
- **Model Security**: Signed model artifacts
- **Network Security**: TLS encryption, network policies

## 📚 Documentation

- **API Docs**: Available at `/docs` endpoint
- **Model Cards**: Documentation for each ML model
- **Runbooks**: Operational procedures
- **Architecture**: System design documents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

Copyright (c) 2024 Nexora Security. All rights reserved.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: Internal Wiki
- **Slack**: #nexora-ml-service
- **Email**: ml-team@nexora.ai

---

**Built with ❤️ by the Nexora ML Team**
