#!/bin/bash

echo "Creating Kafka topics for Nexora threat intelligence..."

# Wait for Kafka to be ready
echo "Waiting for Kafka to be ready..."
sleep 10

# Create threat-intel.ingested topic
docker exec nexora-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic threat-intel.ingested \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms=604800000 \
  --config compression.type=gzip \
  --if-not-exists

echo "✓ Created topic: threat-intel.ingested"

# Create threat-intel.dlq topic (dead letter queue)
docker exec nexora-kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic threat-intel.dlq \
  --partitions 1 \
  --replication-factor 1 \
  --config retention.ms=2592000000 \
  --if-not-exists

echo "✓ Created topic: threat-intel.dlq"

# List all topics
echo ""
echo "All Kafka topics:"
docker exec nexora-kafka kafka-topics --list --bootstrap-server localhost:9092

echo ""
echo "✓ Kafka topics created successfully!"
echo "Access Kafka UI at: http://localhost:8090"
