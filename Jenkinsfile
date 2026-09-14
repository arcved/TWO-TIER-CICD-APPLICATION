pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
    }

    triggers {
        githubPush()
    }

    stages {

        stage('Checkout Source Code') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Python Information') {
            steps {
                sh '''
                    python3 --version
                    pip3 --version
                '''
            }
        }

        stage('Create Virtual Environment') {
            steps {
                sh '''
                    python3 -m venv venv
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    . venv/bin/activate

                    pip install --upgrade pip

                    pip install \
                        Flask==3.1.1 \
                        pytest==8.4.1 \
                        mysql-connector-python

                    pip install -r requirements.txt

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

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                        -t python-test-app:${BUILD_NUMBER} .
                '''
            }
        }

        stage('Verify Docker Image') {
            steps {
                sh '''
                    docker images python-test-app
                '''
            }
        }

        stage('Deploy Stack') {
            steps {
                sh '''
                    docker compose up -d --build
                '''
            }
        }

        stage('Verify Deployments') {
            steps {
                sh '''
                    sleep 10

                    docker ps

                    curl http://localhost:5000/health
                '''
            }
        }
    }

    post {
        always {
            sh '''
                docker ps || true
                docker compose ps || true
            '''
        }
    }
}