from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app) # Allows React to talk to Flask

# --- CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:harvesters1@localhost:5432/hostel_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# Create upload folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db = SQLAlchemy(app)

# --- MODELS ---

# 1. User Model (Matches your pgAdmin 'users' table)
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='student') # 'admin' or 'student'

# 2. Room Model
class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(10), unique=True)
    room_type = db.Column(db.String(20))
    status = db.Column(db.String(20), default='Available')
    max_capacity = db.Column(db.Integer)
    students = db.relationship('Student', backref='room_assigned', lazy=True)

# 3. Student Model
class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100))
    phone_number = db.Column(db.String(15))
    course_name = db.Column(db.String(100))
    payment_status = db.Column(db.String(20), default='Pending')
    receipt_url = db.Column(db.String(255))
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'))

# --- ROUTES ---

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        fullname = data.get('fullname')
        email = data.get('email')
        password = data.get('password')

        # 1. Check if the user already exists in pgAdmin
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                "success": False, 
                "message": "This email is already registered!"
            }), 400

        # 2. Create the new user object
        # Note: We set the default role to 'student'
        new_user = User(
            fullname=fullname,
            email=email,
            password=password,
            role='student' 
        )

        # 3. Save to your pgAdmin 'users' table
        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "success": True, 
            "message": "Account created successfully!"
        }), 201

    except Exception as e:
        print(f"Error during signup: {e}")
        return jsonify({
            "success": False, 
            "message": "Server error. Please try again."
        }), 500

# NEW: Login Route (Connects your login page to the 'users' table)
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')

        # Find user in pgAdmin table
        user = User.query.filter_by(email=email).first()

        if user and user.password == password:
            return jsonify({
                "success": True,
                "user_name": user.fullname,
                "role": user.role
            }), 200
        else:
            return jsonify({
                "success": False, 
                "message": "Invalid email or password"
            }), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 1. Get all rooms with dynamic occupancy calculation
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    all_rooms = Room.query.all()
    result = []
    for r in all_rooms:
        current_count = Student.query.filter_by(room_id=r.id, payment_status='Paid').count()
        display_status = 'Occupied' if current_count >= r.max_capacity else r.status
        
        result.append({
            "id": r.id,
            "number": r.room_number,
            "type": r.room_type,
            "status": display_status,
            "students": current_count,
            "capacity": r.max_capacity
        })
    return jsonify(result)

# 2. Handle Room Booking & Receipt Upload
@app.route('/api/book', methods=['POST'])
def book_room():
    try:
        name = request.form.get('studentName')
        phone = request.form.get('phone')
        room_num = request.form.get('roomNumber')
        course = request.form.get('course', 'Geomatic Engineering')

        file = request.files.get('receipt')
        filename = None
        if file:
            filename = secure_filename(f"{name.replace(' ', '_')}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        room = Room.query.filter_by(room_number=room_num).first()
        
        new_student = Student(
            full_name=name,
            phone_number=phone,
            course_name=course,
            payment_status='Pending',
            receipt_url=filename,
            room_id=room.id if room else None
        )
        db.session.add(new_student)
        db.session.commit()
        
        return jsonify({"message": "Booking submitted successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Get All Students for the List
@app.route('/api/students', methods=['GET'])
def get_students():
    all_students = Student.query.all()
    return jsonify([{
        "id": s.id,
        "name": s.full_name,
        "phone": s.phone_number,
        "room": s.room_assigned.room_number if s.room_assigned else "N/A",
        "status": s.payment_status,
        "course": s.course_name,
        "receipt": s.receipt_url
    } for s in all_students])

# 4. Accept/Verify Student Payment
@app.route('/api/accept-student/<int:student_id>', methods=['POST'])
def accept_student(student_id):
    student = Student.query.get(student_id)
    if student:
        student.payment_status = 'Paid'
        db.session.commit()
        return jsonify({"message": "Payment verified!"})
    return jsonify({"error": "Student not found"}), 404

# 5. Serve Uploaded Images to React
@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- EXECUTION ---
if __name__ == '__main__':
    with app.app_context():
        # This checks for the User table and ensures basic access
        db.create_all()
        
        # Check if an admin exists; if not, create a default one for testing
        if not User.query.filter_by(email='admin@hostel.com').first():
            test_admin = User(
                fullname="System Admin", 
                email="admin@hostel.com", 
                password="admin123", 
                role="admin"
            )
            db.session.add(test_admin)
            db.session.commit()
            print("Default admin created: admin@hostel.com / admin123")

    app.run(debug=True, port=5000)