from flask import Flask, jsonify
import mysql.connector
import os

def create_app():
    app = Flask(__name__)

    def get_connection():
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", "example"),
            database=os.getenv("DB_NAME", "mydb")
        )

    @app.route("/")
    def home():
        return jsonify({"message": "Welcome to the CI/CD Demo Application"})

    @app.route("/users")
    def users():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users")
        result = cursor.fetchall()
        conn.close()
        return jsonify(result)

    @app.route("/health")
    def health():
        return jsonify({"status": "UP"})

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
