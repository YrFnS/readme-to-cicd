# Machine Learning Image Classifier

A deep learning project for image classification using PyTorch and computer vision techniques.

## Overview

This project implements a convolutional neural network (CNN) for classifying images into different categories. It includes data preprocessing, model training, evaluation, and inference capabilities.

## Features

- 🧠 Custom CNN architecture with ResNet backbone
- 📊 Comprehensive data augmentation pipeline
- 📈 Training with validation monitoring
- 🔍 Model evaluation and metrics visualization
- 🚀 REST API for inference
- 🐳 Docker containerization
- ☁️ Cloud deployment ready

## Requirements

- Python 3.9+
- CUDA-compatible GPU (recommended)
- 8GB+ RAM
- 50GB+ storage for datasets

## Installation

### Using pip

```bash
# Clone repository
git clone https://github.com/example/ml-image-classifier.git
cd ml-image-classifier

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Using conda

```bash
# Create conda environment
conda env create -f environment.yml
conda activate ml-classifier

# Install additional dependencies
pip install -e .
```

### Using Docker

```bash
# Build Docker image
docker build -t ml-classifier .

# Run container
docker run -p 8000:8000 ml-classifier
```

## Usage

### Training

```bash
# Train model with default settings
python train.py

# Train with custom configuration
python train.py --config configs/resnet50.yaml --epochs 100 --batch-size 32

# Resume training from checkpoint
python train.py --resume checkpoints/model_epoch_50.pth
```

### Evaluation

```bash
# Evaluate model on test set
python evaluate.py --model-path checkpoints/best_model.pth

# Generate confusion matrix
python evaluate.py --model-path checkpoints/best_model.pth --confusion-matrix

# Calculate per-class metrics
python evaluate.py --model-path checkpoints/best_model.pth --detailed-metrics
```

### Inference

```bash
# Single image prediction
python predict.py --image path/to/image.jpg --model checkpoints/best_model.pth

# Batch prediction
python predict.py --input-dir images/ --output-dir predictions/ --model checkpoints/best_model.pth
```

### API Server

```bash
# Start FastAPI server
uvicorn api.main:app --host 0.0.0.0 --port 8000

# Start with auto-reload for development
uvicorn api.main:app --reload
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test categories
pytest tests/unit/          # Unit tests
pytest tests/integration/   # Integration tests
pytest tests/performance/   # Performance tests

# Run tests with GPU
pytest --gpu

# Run tests in parallel
pytest -n auto
```

## Project Structure

```
├── src/
│   ├── models/             # Model architectures
│   │   ├── cnn.py
│   │   └── resnet.py
│   ├── data/               # Data loading and preprocessing
│   │   ├── dataset.py
│   │   └── transforms.py
│   ├── training/           # Training utilities
│   │   ├── trainer.py
│   │   └── losses.py
│   ├── utils/              # Utility functions
│   │   ├── metrics.py
│   │   └── visualization.py
│   └── api/                # REST API
│       ├── main.py
│       └── routes.py
├── configs/                # Configuration files
│   ├── base.yaml
│   └── resnet50.yaml
├── tests/                  # Test suite
├── notebooks/              # Jupyter notebooks
├── data/                   # Dataset directory
├── checkpoints/            # Model checkpoints
└── logs/                   # Training logs
```

## Configuration

The project uses YAML configuration files. Example configuration:

```yaml
# configs/base.yaml
model:
  name: "resnet50"
  num_classes: 10
  pretrained: true

training:
  epochs: 100
  batch_size: 32
  learning_rate: 0.001
  optimizer: "adam"
  scheduler: "cosine"

data:
  train_dir: "data/train"
  val_dir: "data/val"
  test_dir: "data/test"
  image_size: 224
  augmentation: true
```

## Environment Variables

```bash
# .env file
CUDA_VISIBLE_DEVICES=0,1
WANDB_API_KEY=your_wandb_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
MODEL_REGISTRY_URL=s3://your-bucket/models
```

## Performance Benchmarks

| Model | Accuracy | Inference Time | Model Size |
|-------|----------|----------------|------------|
| ResNet50 | 94.2% | 15ms | 98MB |
| EfficientNet-B0 | 95.1% | 12ms | 21MB |
| Custom CNN | 92.8% | 8ms | 45MB |

## Deployment

### AWS SageMaker

```bash
# Deploy to SageMaker
python deploy/sagemaker_deploy.py --model-path checkpoints/best_model.pth

# Create endpoint
aws sagemaker create-endpoint --endpoint-name ml-classifier-prod
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Monitoring

The project includes comprehensive monitoring:

- **Weights & Biases**: Training metrics and model versioning
- **Prometheus**: System metrics collection
- **Grafana**: Visualization dashboards
- **MLflow**: Experiment tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Citation

If you use this project in your research, please cite:

```bibtex
@software{ml_image_classifier,
  title={Machine Learning Image Classifier},
  author={Your Name},
  year={2024},
  url={https://github.com/example/ml-image-classifier}
}
```