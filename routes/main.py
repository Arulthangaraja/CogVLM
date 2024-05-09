from flask import Flask, request, make_response


app = Flask(__name__)

# Health check route
@app.route("/api/v1/health", methods=["GET"])
def health_check():
    response = make_response("Ok", 200)
    print ("Ok")
    return response


if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=8080)