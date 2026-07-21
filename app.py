from flask import Flask, jsonify


def create_app():
    app = Flask(__name__)

    @app.route("/")
    def home():
        return jsonify({
            "message": "Welcome to the CI/CD Demo Application"
        })

    @app.route("/health")
    def health():
        return jsonify({
            "status": "UP"
        })

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)