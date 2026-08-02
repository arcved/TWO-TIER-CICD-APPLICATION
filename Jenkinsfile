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
        stage('Deploy'){
            steps{
                echo 'Deploying...'
            }
        }
    }
}
