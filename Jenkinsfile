pipeline {
    agent any

    environment {
        IMAGE_NAME = "python-test-app"
        IMAGE_TAG = "v1"
        CONTAINER_NAME = "python-test-app"

        HTTP_PROXY = "http://10.158.100.6:8080"
        HTTPS_PROXY = "http://10.158.100.6:8080"
        NO_PROXY = "localhost,127.0.0.1"

        http_proxy = "http://10.158.100.6:8080"
        https_proxy = "http://10.158.100.6:8080"
        no_proxy = "localhost,127.0.0.1"
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
                    export http_proxy=$HTTP_PROXY
                    export https_proxy=$HTTPS_PROXY
                    export no_proxy=$NO_PROXY

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
                    export http_proxy=$HTTP_PROXY
                    export https_proxy=$HTTPS_PROXY
                    export no_proxy=$NO_PROXY

                    echo "Creating Virtual Environment..."

                    python3 -m venv venv

                    ls -la
                '''
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    echo "===== Proxy Environment ====="
                    env | grep -i proxy

                    . venv/bin/activate

                    echo "===== Python ====="
                    python --version

                    echo "===== Pip ====="
                    pip --version

                    python -m pip install --upgrade pip

                    python3 -m pip install -r requirements.txt

                    pip list

                '''
            }
        }

        stage('Run Unit Tests') {
            steps {
                sh '''
                    export http_proxy=$HTTP_PROXY
                    export https_proxy=$HTTPS_PROXY
                    export no_proxy=$NO_PROXY

                    . venv/bin/activate

                    pytest -v
                '''
            }
        }
        stage("Building Docker images"){
            steps{
                echo "Building docker image"
                sh '''
                docker build \
                 --build-arg HTTP_PROXY=http://10.158.100.6:8080 \
                 --build-arg HTTPS_PROXY=http://10.158.100.6:8080 \
                 --build-arg NO_PROXY=localhost,127.0.0.1 \
                 -t python-test-app${BUILD_NUMBER} .
                '''
            }
        }
        stage("Verify Images"){
            steps{
                sh 'docker images'
            }
        }
        stage("Stop existing conatiner"){
            steps{
                echo 'Stopping the existing container............'
                sh 'docker stop python-test-app || true'
            }
        }
        stage('remove existing container'){
            steps{
                echo ' removing existing container (if present)..........'
                sh '''
                docker rm python-test-app || true
                '''
            }
        }
        stage("Deploy Application"){
            steps{
                echo "Staring a new application container"
                sh '''
                docker run -d \
                 --name python-test-app \
                 -p 5000:5000 \
                 python-test-app${BUILD_NUMBER}
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
        response = urllib.request.urlopen('http://localhost:5000/health')
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