pipeline{
    agent any
    stages{
        stage('Build'){
            steps{
                checkout scm
            }
        }
        stage('Python version'){
            steps{
                sh 'python3 --version'
            }
        }
        stage('Initialize env'){
            steps{
                sh 'python3 -m venv venv'
            }
        }
        stage('Install dependencies'){
            steps{
                sh 'venv/bin/pip install -r requirements.txt'
            }
        }
        stage('Test'){
            steps{
                sh 'venv/bin/pytest -v'
            }
        }
        stage('Build Docker Image'){
            steps{
                sh 'docker build -t python-cicd-app:${BUILD_NUMBER} .'
            }
        }
        stage('Verify docker image'){
            steps{
                sh 'docker images'
            }
        }
       stage('Run docker container'){
            steps{
                sh '''
                    docker rm -f python-cicd-container || true
        
                    docker run -d \
                        --name python-cicd-container \
                        -p 5000:5000 \
                        python-cicd-app:${BUILD_NUMBER}
                '''
            }
        }
        stage('Verify docker container'){
            steps{
                sh 'docker ps'
            }
        }
        stage('Health check'){
            steps{
                echo 'starting Health check'
                sh '''
                    sleep 5
                    curl -f http://localhost:5000/health
                '''
            }
        }
        stage('Pipeline completed'){
            steps{
                echo 'Pipeline completed successfully'
            }
        }
    }
}
