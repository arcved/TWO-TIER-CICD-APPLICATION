pipeline {

    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {

        stage('Checkout Source Code') {
            steps {
                echo 'Checking out source code...'

                checkout scm
            }
        }

        stage('Workspace Information') {
            steps {
                sh '''
                    echo "=============================="
                    echo "Workspace Information"
                    echo "=============================="

                    echo "Current Directory:"
                    pwd

                    echo ""
                    echo "Files:"
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
                    echo "=============================="
                    echo "Creating Virtual Environment"
                    echo "=============================="

                    python3 -m venv venv

                    echo "Virtual environment created."

                    ls -la venv
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "=============================="
                    echo "Installing Dependencies"
                    echo "=============================="

                    . venv/bin/activate

                    echo "Python:"
                    python --version

                    echo ""
                    echo "Pip:"
                    pip --version

                    echo ""
                    echo "Installing requirements..."

                    pip install --upgrade pip
                    pip install -r requirements.txt

                    echo ""
                    echo "Installed packages:"
                    pip list
                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    echo "=============================="
                    echo "Running Unit Tests"
                    echo "=============================="

                    . venv/bin/activate

                    pytest -v
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'

                sh '''
                    docker build \
                        -t python-test-app:${BUILD_NUMBER} .
                '''
            }
        }

        stage('Verify Docker Image') {
            steps {
                echo 'Verifying Docker image...'

                sh '''
                    docker images python-test-app
                '''
            }
        }
    }

    post {

        success {
            echo "===================================="
            echo "CI PIPELINE SUCCESSFUL"
            echo "===================================="
            echo "Tests passed."
            echo "Docker image built successfully."
            echo "===================================="
        }

        failure {
            echo "===================================="
            echo "CI PIPELINE FAILED"
            echo "===================================="
            echo "Check the Console Output."
            echo "===================================="
        }

        always {
            sh '''
                echo "=============================="
                echo "Docker Images"
                echo "=============================="

                docker images python-test-app || true
            '''
        }
    }
}
