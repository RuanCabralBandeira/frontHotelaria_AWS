pipeline {

    agent any

    stages {

        stage('Install Dependencies') {

            steps {

                sh 'npm install'
            }
        }

        stage('Prisma Generate') {

            steps {

                sh 'npx prisma generate'
            }
        }

        stage('Docker Build') {

            steps {

                sh 'docker compose build'
            }
        }

        stage('Docker Up') {

            steps {

                sh 'docker compose up -d'
            }
        }

        stage('Docker PS') {

            steps {

                sh 'node -v'
                sh 'npm -v'
            }
        }
    }

    post {

        success {

            echo 'Pipeline executada com sucesso!'
        }

        failure {

            echo 'Erro na pipeline!'
        }
    }
}
