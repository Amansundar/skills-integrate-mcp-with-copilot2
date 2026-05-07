"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
import os
import json
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")

# Load activities from JSON file
def load_activities():
    activities_file = os.path.join(Path(__file__).parent, "activities.json")
    with open(activities_file, "r") as f:
        return json.load(f)

# Load teacher credentials from JSON file
def load_credentials():
    credentials_file = os.path.join(Path(__file__).parent, "credentials.json")
    if not os.path.exists(credentials_file):
        return {}
    with open(credentials_file, "r") as f:
        return json.load(f)

# In-memory storage for currently logged-in teachers (session tokens)
logged_in_users = {}

activities = load_activities()
credentials = load_credentials()


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.post("/login")
def login(username: str, password: str):
    """Teacher login endpoint"""
    if username not in credentials or credentials[username] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate a simple session token
    token = f"{username}:{hash(username + password)}"
    logged_in_users[token] = username
    return {"token": token, "username": username}


@app.post("/logout")
def logout(token: str):
    """Teacher logout endpoint"""
    if token in logged_in_users:
        del logged_in_users[token]
        return {"message": "Logged out successfully"}
    raise HTTPException(status_code=401, detail="Invalid token")


@app.post("/verify-auth")
def verify_auth(token: str):
    """Verify if teacher is authenticated"""
    if token in logged_in_users:
        return {"authenticated": True, "username": logged_in_users[token]}
    return {"authenticated": False}


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, token: str = ""):
    """Sign up a student for an activity (requires teacher auth)"""
    # Check authentication for teacher
    if token and token not in logged_in_users:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]
    
    # Check capacity
    if len(activity["participants"]) >= activity["max_participants"]:
        raise HTTPException(status_code=400, detail="Activity is full")

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, token: str = ""):
    """Unregister a student from an activity (requires teacher auth for non-owner)"""
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
