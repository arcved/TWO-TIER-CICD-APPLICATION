pipeline {
    agent any

    environment {
        IMAGE_NAME = "python-test-app"
        IMAGE_TAG = "v1"
        CONTAINER_NAME = "python-test-app"
    }

    stages {

        stage('Checkout Source') {
            steps {
                echo "Checking out source code..."
                checkout scm
            }
        }

        stage('Workspace Information') {
            steps {
                sh '''
                    echo "=============================="
                    echo "Workspace Information"
                    echo "=============================="

                    pwd
                    ls -la

                    echo ""
                    echo "Current User:"
                    whoami

                    echo ""
                    echo "Hostname:"
                    hostname
                '''
            }
        }

        stage('Python Information') {
            steps {
                sh '''
                    echo "=============================="
                    echo "Python Information"
                    echo "=============================="

                    python3 --version
                    pip3 --version
                '''
            }
        }

        stage('Create Virtual Environment') {
            steps {
                sh '''
                    echo "Creating Virtual Environment..."

                    python3 -m venv venv

                    ls -la
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    . venv/bin/activate

                    echo "===== Python ====="
                    python --version

                    echo "===== Pip ====="
                    pip --version

                    python -m pip install --upgrade pip

                    python -m pip install -r requirements.txt

                    pip list
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    . venv/bin/activate

                    pytest -v
                '''
            }
        }

        stage('Building Docker Image') {
            steps {
                echo "Building Docker image..."
                sh '''
                    docker build -t python-test-app:${BUILD_NUMBER} .
                '''
            }
        }

        stage('Verify Images') {
            steps {
                sh 'docker images'
            }
        }

        stage('Stop Existing Container') {
            steps {
                echo 'Stopping existing container (if running)...'
                sh 'docker stop python-test-app || true'
            }
        }

        stage('Remove Existing Container') {
            steps {
                echo 'Removing existing container (if present)...'
                sh 'docker rm python-test-app || true'
            }
        }

        stage('Deploy Application') {
            steps {
                echo "Starting a new application container..."
                sh '''
                    docker run -d \
                        --name python-test-app \
                        -p 5000:5000 \
                        python-test-app:${BUILD_NUMBER}
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Verifying application...'

                sh '''
                    sleep 10

                    docker exec python-test-app python - <<EOF
import urllib.request
response = urllib.request.urlopen("http://localhost:5000/health")
print(response.read().decode())
EOF
                '''
            }
        }
    }

    post {
        success {
            echo "===================================="
            echo "Pipeline executed successfully!"
            echo "Application deployed successfully."
            echo "===================================="
        }

        failure {
            echo "===================================="
            echo "Pipeline failed!"
            echo "Check Console Output for details."
            echo "===================================="
        }

        always {
            sh 'docker ps -a'
        }
    }
}