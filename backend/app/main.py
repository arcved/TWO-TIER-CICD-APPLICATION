import os
import re
from datetime import datetime, timezone

from bson import ObjectId
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError

STATUSES = ("open", "in_progress", "blocked", "done")
PRIORITIES = ("low", "medium", "high", "critical")
CATEGORIES = ("incident", "change", "task", "access")
SEED_REQUESTS = [
    {
        "title": "Investigate intermittent API timeouts",
        "description": "Review gateway latency and identify the source of intermittent timeouts.",
        "status": "in_progress",
        "priority": "high",
        "category": "incident",
        "assignee": "Morgan Lee",
        "reporter": "Alex Chen",
    },
    {
        "title": "Provision staging database access",
        "description": "Grant the QA team read-only access to the staging database.",
        "status": "open",
        "priority": "medium",
        "category": "access",
        "assignee": "Jamie Patel",
        "reporter": "Taylor Kim",
    },
    {
        "title": "Rotate payment service credentials",
        "description": "Coordinate credential rotation and validate the payment integration.",
        "status": "blocked",
        "priority": "critical",
        "category": "change",
        "assignee": "Riley Brooks",
        "reporter": "Jordan Park",
    },
    {
        "title": "Document release checklist",
        "description": "Capture the deployment verification steps for the next release.",
        "status": "done",
        "priority": "low",
        "category": "task",
        "assignee": "Casey Nguyen",
        "reporter": "Alex Chen",
    },
]

app = Flask(__name__)
origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CORS(app, resources={r"/api/*": {"origins": [item.strip() for item in origins.split(",") if item.strip()]}})

mongo_client = MongoClient(
    os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
    serverSelectionTimeoutMS=3000,
)
requests_collection = mongo_client[os.getenv("MONGODB_DB", "clearpath")]["requests"]


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def serialize_request(document):
    result = dict(document)
    result["id"] = str(result.pop("_id"))
    for key in ("created_at", "updated_at"):
        value = result.get(key)
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def validate_payload(payload, partial=False):
    if not isinstance(payload, dict):
        return None, "A JSON object is required."

    fields = ("title", "description", "status", "priority", "category", "assignee", "reporter")
    values = {}
    for field in fields:
        if partial and field not in payload:
            continue
        value = payload.get(field, "")
        if not isinstance(value, str):
            return None, "{} must be a string.".format(field)
        value = value.strip()
        if field == "title" and not value:
            return None, "title is required."
        if field == "status" and value not in STATUSES:
            return None, "status must be one of: {}.".format(", ".join(STATUSES))
        if field == "priority" and value not in PRIORITIES:
            return None, "priority must be one of: {}.".format(", ".join(PRIORITIES))
        if field == "category" and value not in CATEGORIES:
            return None, "category must be one of: {}.".format(", ".join(CATEGORIES))
        values[field] = value
    return values, None


def seed_if_empty():
    if requests_collection.count_documents({}) == 0:
        now = utc_now()
        documents = [
            dict(item, created_at=now, updated_at=now)
            for item in SEED_REQUESTS
        ]
        requests_collection.insert_many(documents)


@app.get("/api/health")
def health():
    try:
        mongo_client.admin.command("ping")
    except PyMongoError as error:
        app.logger.error("MongoDB health check failed: %s", error)
        return jsonify({"status": "unhealthy", "database": "unavailable"}), 503
    return jsonify({"status": "healthy", "database": "connected"}), 200


@app.get("/api/requests/stats")
def request_stats():
    try:
        statuses = {
            status: requests_collection.count_documents({"status": status})
            for status in STATUSES
        }
        priorities = {
            priority: requests_collection.count_documents({"priority": priority})
            for priority in PRIORITIES
        }
        return jsonify({
            "total": requests_collection.count_documents({}),
            "by_status": statuses,
            "by_priority": priorities,
        })
    except PyMongoError as error:
        app.logger.exception("Unable to load request statistics")
        return jsonify({"error": "Unable to load request statistics."}), 503


@app.get("/api/requests")
def list_requests():
    filters = {}
    status = request.args.get("status", "").strip()
    priority = request.args.get("priority", "").strip()
    search = request.args.get("search", "").strip()
    if status:
        if status not in STATUSES:
            return jsonify({"error": "Invalid status filter."}), 400
        filters["status"] = status
    if priority:
        if priority not in PRIORITIES:
            return jsonify({"error": "Invalid priority filter."}), 400
        filters["priority"] = priority
    if search:
        pattern = re.escape(search)
        filters["$or"] = [
            {"title": {"$regex": pattern, "$options": "i"}},
            {"description": {"$regex": pattern, "$options": "i"}},
            {"assignee": {"$regex": pattern, "$options": "i"}},
            {"reporter": {"$regex": pattern, "$options": "i"}},
        ]
    try:
        documents = requests_collection.find(filters).sort("updated_at", -1)
        return jsonify([serialize_request(document) for document in documents])
    except PyMongoError:
        app.logger.exception("Unable to list work requests")
        return jsonify({"error": "Unable to list work requests."}), 503


@app.get("/api/requests/<request_id>")
def get_request(request_id):
    if not ObjectId.is_valid(request_id):
        return jsonify({"error": "Work request not found."}), 404
    try:
        document = requests_collection.find_one({"_id": ObjectId(request_id)})
    except PyMongoError:
        app.logger.exception("Unable to load work request")
        return jsonify({"error": "Unable to load work request."}), 503
    if document is None:
        return jsonify({"error": "Work request not found."}), 404
    return jsonify(serialize_request(document))


@app.post("/api/requests")
def create_request():
    values, error = validate_payload(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400
    now = utc_now()
    document = dict(values, created_at=now, updated_at=now)
    try:
        result = requests_collection.insert_one(document)
        document["_id"] = result.inserted_id
    except PyMongoError:
        app.logger.exception("Unable to create work request")
        return jsonify({"error": "Unable to create work request."}), 503
    return jsonify(serialize_request(document)), 201


@app.put("/api/requests/<request_id>")
def update_request(request_id):
    if not ObjectId.is_valid(request_id):
        return jsonify({"error": "Work request not found."}), 404
    values, error = validate_payload(request.get_json(silent=True), partial=True)
    if error:
        return jsonify({"error": error}), 400
    values["updated_at"] = utc_now()
    try:
        result = requests_collection.find_one_and_update(
            {"_id": ObjectId(request_id)},
            {"$set": values},
            return_document=True,
        )
    except PyMongoError:
        app.logger.exception("Unable to update work request")
        return jsonify({"error": "Unable to update work request."}), 503
    if result is None:
        return jsonify({"error": "Work request not found."}), 404
    return jsonify(serialize_request(result))


@app.delete("/api/requests/<request_id>")
def delete_request(request_id):
    if not ObjectId.is_valid(request_id):
        return jsonify({"error": "Work request not found."}), 404
    try:
        result = requests_collection.delete_one({"_id": ObjectId(request_id)})
    except PyMongoError:
        app.logger.exception("Unable to delete work request")
        return jsonify({"error": "Unable to delete work request."}), 503
    if result.deleted_count == 0:
        return jsonify({"error": "Work request not found."}), 404
    return "", 204


if __name__ == "__main__":
    try:
        seed_if_empty()
    except PyMongoError:
        app.logger.exception("Unable to seed MongoDB; verify the database connection")
        raise
    app.run(host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "5000")))
