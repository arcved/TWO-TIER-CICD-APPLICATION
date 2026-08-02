pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Python Version') {
            steps {
                sh 'python3 --version'
            }
        }

        stage('Initialize Environment') {
            steps {
                sh 'python3 -m venv venv'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'venv/bin/pip install -r requirements.txt'
            }
        }

        stage('Test') {
            steps {
                sh 'venv/bin/pytest -v'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t python-cicd-app:${BUILD_NUMBER} .'
            }
        }

        stage('Verify Docker Image') {
            steps {
                sh 'docker images'
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                    docker rm -f python-cicd-container || true

                    docker run -d \
                        --name python-cicd-container \
                        -p 5000:5000 \
                        python-cicd-app:${BUILD_NUMBER}
                '''
            }
        }

        stage('Verify Docker Container') {
            steps {
                sh 'docker ps'
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 5
                    curl -f http://localhost:5000/health
                '''
            }
        }

        stage('Pipeline Completed') {
            steps {
                echo 'Pipeline completed successfully'
            }
        }
    }
}
