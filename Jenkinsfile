pipeline {
    agent any

    environment {
        NETWORK_NAME = 'clearpath-net'
    }

    stages {
        stage('Checkout scm') {
            steps {
                checkout scm
            }
        }

        stage('Verify checkout') {
            steps {
                powershell '''
                    $required = @(
                        'Jenkinsfile',
                        'README.md',
                        'backend\\Dockerfile',
                        'backend\\requirements.txt',
                        'backend\\.env.example',
                        'backend\\app\\main.py',
                        'frontend\\Dockerfile',
                        'frontend\\package.json',
                        'frontend\\.env.example',
                        'frontend\\src\\App.jsx',
                        'frontend\\nginx.conf',
                        'database\\Dockerfile',
                        'database\\.dockerignore'
                    )
                    foreach ($path in $required) {
                        if (-not (Test-Path $path)) { throw "Required path missing: $path" }
                    }
                    Write-Host "Commit: $(git rev-parse HEAD)"
                '''
            }
        }

        stage('Verify Docker access') {
            steps {
                powershell 'docker info | Out-Null; if ($LASTEXITCODE -ne 0) { throw "Docker is unavailable" }'
            }
        }

        stage('Build images') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $images = @(
                        @{ name = 'clearpath-frontend-image'; path = 'frontend' },
                        @{ name = 'clearpath-backend-image'; path = 'backend' },
                        @{ name = 'clearpath-database-image'; path = 'database' }
                    )
                    foreach ($image in $images) {
                        docker build -t "$($image.name):latest" -t "$($image.name):$env:BUILD_NUMBER" $image.path
                        if ($LASTEXITCODE -ne 0) { throw "Build failed: $($image.name)" }
                    }
                '''
            }
        }

        stage('Verify images') {
            steps {
                powershell '''
                    $images = @('clearpath-frontend-image', 'clearpath-backend-image', 'clearpath-database-image')
                    foreach ($image in $images) {
                        docker image inspect "${image}:latest" | Out-Null
                        if ($LASTEXITCODE -ne 0) { throw "Missing image: ${image}:latest" }
                        docker image inspect "${image}:$env:BUILD_NUMBER" | Out-Null
                        if ($LASTEXITCODE -ne 0) { throw "Missing image: ${image}:$env:BUILD_NUMBER" }
                    }
                '''
            }
        }

        stage('Ensure network') {
            steps {
                powershell '''
                    $networks = docker network ls --format '{{.Name}}'
                    if ($networks -notcontains $env:NETWORK_NAME) {
                        docker network create $env:NETWORK_NAME
                        if ($LASTEXITCODE -ne 0) { throw "Could not create network $env:NETWORK_NAME" }
                    }
                    $volumes = docker volume ls --format '{{.Name}}'
                    if ($volumes -notcontains 'clearpath-mongo-data') {
                        docker volume create clearpath-mongo-data
                        if ($LASTEXITCODE -ne 0) { throw "Could not create MongoDB data volume" }
                    }
                '''
            }
        }

        stage('Remove old containers') {
            steps {
                powershell '''
                    foreach ($name in @('frontend', 'backend', 'database')) {
                        $existing = docker ps --all --quiet --filter "name=^/$name$"
                        if ($existing) {
                            docker rm --force $name
                            if ($LASTEXITCODE -ne 0) { throw "Could not remove old container: $name" }
                        }
                    }
                '''
            }
        }

        stage('Deploy containers') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    docker run --detach --name database --network $env:NETWORK_NAME --publish 27017:27017 --volume clearpath-mongo-data:/data/db clearpath-database-image:latest
                    if ($LASTEXITCODE -ne 0) { throw "Database container deployment failed" }

                    $databaseReady = $false
                    for ($attempt = 0; $attempt -lt 30; $attempt++) {
                        docker exec database mongosh --quiet --eval "db.adminCommand('ping').ok" 2>$null | Out-Null
                        if ($LASTEXITCODE -eq 0) { $databaseReady = $true; break }
                        Start-Sleep -Seconds 2
                    }
                    if (-not $databaseReady) { throw "Database did not become ready" }

                    docker run --detach --name backend --network $env:NETWORK_NAME --publish 5000:5000 --env MONGODB_URI=mongodb://database:27017 --env MONGODB_DB=clearpath --env CORS_ORIGINS=http://localhost:3000 clearpath-backend-image:latest
                    if ($LASTEXITCODE -ne 0) { throw "Backend container deployment failed" }

                    docker run --detach --name frontend --network $env:NETWORK_NAME --publish 3000:80 clearpath-frontend-image:latest
                    if ($LASTEXITCODE -ne 0) { throw "Frontend container deployment failed" }
                '''
            }
        }

        stage('Verify containers') {
            steps {
                powershell '''
                    foreach ($name in @('database', 'backend', 'frontend')) {
                        $running = docker inspect --format '{{.State.Running}}' $name
                        if ($LASTEXITCODE -ne 0 -or $running -ne 'true') { throw "Container is not running: $name" }
                    }
                '''
            }
        }

        stage('Health checks') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'
                    $urls = @('http://localhost:5000/api/health', 'http://localhost:3000/api/health')
                    foreach ($url in $urls) {
                        curl.exe --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 3 --max-time 30 $url
                        if ($LASTEXITCODE -ne 0) { throw "Health check failed: $url" }
                    }
                '''
            }
        }
    }

    post {
        success {
            echo 'Clearpath deployment completed successfully.'
        }
        failure {
            echo 'Clearpath pipeline failed. Review the stage logs.'
        }
        unstable {
            echo 'Clearpath pipeline completed with unstable status.'
        }
        aborted {
            echo 'Clearpath pipeline was aborted.'
        }
        always {
            echo 'Clearpath pipeline finished.'
        }
    }
}
