from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app) 

# --- CONFIGURATION ---
# Checks for Render's DATABASE_URL first, falls back to local pgAdmin
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'postgresql://postgres:harvesters1@localhost:5432/hostel_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# Create upload folder if it doesn't exist
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db = SQLAlchemy(app)

# --- MODELS ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='student')

class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(10), unique=True)
    room_type = db.Column(db.String(20))
    status = db.Column(db.String(20), default='Available')
    max_capacity = db.Column(db.Integer)
    students = db.relationship('Student', backref='room_assigned', lazy=True)

class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100))
    phone_number = db.Column(db.String(15))
    course_name = db.Column(db.String(100))
    payment_status = db.Column(db.String(20), default='Pending')
    receipt_url = db.Column(db.String(255))
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'))

# --- DATABASE INITIALIZATION ---
with app.app_context():
    # 1. Create all tables in Neon/Local
    db.create_all()

    # 2. Seed Default Admin
    if not User.query.filter_by(email='admin@hostel.com').first():
        test_admin = User(
            fullname="System Admin", 
            email="admin@hostel.com", 
            password="admin123", 
            role="admin"
        )
        db.session.add(test_admin)
        db.session.commit()
        print("Admin user created!")

    # 3. Seed 36 Rooms if the table is empty
    if not Room.query.first():
        print("Seeding rooms...")
        # 18 Male Rooms
        for i in range(1, 19):
            db.session.add(Room(room_number=f"M{i}", room_type="Male", max_capacity=4))
        # 18 Female Rooms
        for i in range(1, 19):
            db.session.add(Room(room_number=f"F{i}", room_type="Female", max_capacity=4))
        
        db.session.commit()
        print("36 Rooms seeded successfully!")

# --- ROUTES ---

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({"success": False, "message": "Email already registered!"}), 400
        
        new_user = User(
            fullname=data.get('fullname'), 
            email=data.get('email'), 
            password=data.get('password'), 
            role='student'
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"success": True, "message": "Account created!"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        user = User.query.filter_by(email=data.get('email')).first()
        if user and user.password == data.get('password'):
            return jsonify({"success": True, "user_name": user.fullname, "role": user.role}), 200
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    all_rooms = Room.query.all()
    result = []
    for r in all_rooms:
        current_count = Student.query.filter_by(room_id=r.id, payment_status='Paid').count()
        display_status = 'Occupied' if current_count >= r.max_capacity else r.status
        result.append({
            "id": r.id, "number": r.room_number, "type": r.room_type,
            "status": display_status, "students": current_count, "capacity": r.max_capacity
        })
    return jsonify(result)

@app.route('/api/book', methods=['POST'])
def book_room():
    try:
        name = request.form.get('studentName')
        room_num = request.form.get('roomNumber')
        file = request.files.get('receipt')
        
        filename = None
        if file:
            filename = secure_filename(f"{name}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        room = Room.query.filter_by(room_number=room_num).first()
        new_student = Student(
            full_name=name, phone_number=request.form.get('phone'),
            course_name=request.form.get('course', 'Geomatic Engineering'),
            payment_status='Pending', receipt_url=filename, room_id=room.id if room else None
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify({"message": "Booking submitted"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/students', methods=['GET'])
def get_students():
    all_students = Student.query.all()
    return jsonify([{
        "id": s.id, "name": s.full_name, "phone": s.phone_number,
        "room": s.room_assigned.room_number if s.room_assigned else "N/A",
        "status": s.payment_status, "course": s.course_name, "receipt": s.receipt_url
    } for s in all_students])

@app.route('/api/accept-student/<int:student_id>', methods=['POST'])
def accept_student(student_id):
    student = Student.query.get(student_id)
    if student:
        student.payment_status = 'Paid'
        db.session.commit()
        return jsonify({"message": "Payment verified!"})
    return jsonify({"error": "Student not found"}), 404

@app.route('/uploads/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
