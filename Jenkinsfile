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
                sh 'docker build -t python-cicd:{BUILD_NUMBER} .'
            }
        }
        stage('Verify docker image'){
            steps{
                sh 'docker images'
            }
        }
        stage('Run docker container'){
            steps{
                sh 'docker run -d -p 5000:5000 cicd-app-build:v1'
            }
        }
        stage('Verify docker container'){
            steps{
                sh 'docker ps'
            }
        }
        stage('Pipeline completed'){
            steps{
                echo 'Pipeline completed successfully'
            }
        }
    }
}
