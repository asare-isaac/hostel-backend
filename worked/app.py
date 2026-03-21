from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import cloudinary
import cloudinary.uploader

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'postgresql://postgres:harvesters1@localhost:5432/hostel_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- CLOUDINARY CONFIG ---
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'decyikrrc'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', '359759534989986'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 't_Ch8-IamrAQ119dA7m6guuyYDk'),
    secure=True
)

# --- MODELS ---

class User(db.Model):
    __tablename__ = 'users'
    id       = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    email    = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role     = db.Column(db.String(20), default='student')

class Room(db.Model):
    __tablename__ = 'rooms'
    id           = db.Column(db.Integer, primary_key=True)
    room_number  = db.Column(db.String(10), unique=True)
    room_type    = db.Column(db.String(20))
    status       = db.Column(db.String(20), default='Available')
    max_capacity = db.Column(db.Integer)
    students     = db.relationship('Student', backref='room_assigned', lazy=True)

class Student(db.Model):
    __tablename__   = 'students'
    id              = db.Column(db.Integer, primary_key=True)
    full_name       = db.Column(db.String(100))
    phone_number    = db.Column(db.String(15))
    course_name     = db.Column(db.String(100))
    payment_status  = db.Column(db.String(20), default='Pending')
    receipt_url     = db.Column(db.String(500))   # Now stores Cloudinary URL (longer)
    room_id         = db.Column(db.Integer, db.ForeignKey('rooms.id'))

class Receipt(db.Model):
    __tablename__   = 'receipts'
    id              = db.Column(db.Integer, primary_key=True)
    student_name    = db.Column(db.String(100), nullable=False)
    student_email   = db.Column(db.String(100), nullable=False)
    receipt_url     = db.Column(db.String(500), nullable=False)
    status          = db.Column(db.String(20), default='Pending')  # Pending, Approved, Declined

# --- DATABASE INITIALIZATION ---
with app.app_context():
    db.create_all()

    if not User.query.filter_by(email='admin@hostel.com').first():
        db.session.add(User(
            fullname="System Admin",
            email="admin@hostel.com",
            password="admin123",
            role="admin"
        ))
        db.session.commit()
        print("Admin user created!")

    if not Room.query.first():
        print("Seeding rooms...")
        for i in range(1, 19):
            db.session.add(Room(room_number=f"M{i}", room_type="Male", max_capacity=4))
        for i in range(1, 19):
            db.session.add(Room(room_number=f"F{i}", room_type="Female", max_capacity=4))
        db.session.commit()
        print("36 Rooms seeded successfully!")

# --- HELPER ---
def upload_to_cloudinary(file, folder="hostel_receipts"):
    """Upload a file object to Cloudinary and return the secure URL."""
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="auto"   # handles images and PDFs
    )
    return result.get('secure_url')

# --- ROUTES ---

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.json
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({"success": False, "message": "Email already registered!"}), 400
        db.session.add(User(
            fullname=data.get('fullname'),
            email=data.get('email'),
            password=data.get('password'),
            role='student'
        ))
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
            "id": r.id,
            "number": r.room_number,
            "type": r.room_type,
            "status": display_status,
            "students": current_count,
            "capacity": r.max_capacity
        })
    return jsonify(result)

@app.route('/api/students', methods=['GET'])
def get_students():
    """
    Returns all students with fields that match the React frontend exactly:
    name, room, course, status, receipt
    """
    all_students = Student.query.order_by(Student.id.desc()).all()
    result = []
    for s in all_students:
        room = db.session.get(Room, s.room_id)
        result.append({
            "id": s.id,
            "name": s.full_name,
            "room": room.room_number if room else "N/A",
            "course": s.course_name or "University of Mines and Tech",
            "status": s.payment_status,
            "receipt": s.receipt_url   # Full Cloudinary HTTPS URL
        })
    return jsonify(result)

@app.route('/api/book', methods=['POST'])
def book_room():
    try:
        name     = request.form.get('studentName')
        room_num = request.form.get('roomNumber')
        phone    = request.form.get('phone')
        file     = request.files.get('receipt')

        if not name or not room_num:
            return jsonify({"error": "Student name and room number are required"}), 400

        room = Room.query.filter_by(room_number=room_num).first()
        if not room:
            return jsonify({"error": f"Room {room_num} not found"}), 404

        # Check room capacity before booking
        current_count = Student.query.filter_by(room_id=room.id, payment_status='Paid').count()
        if current_count >= room.max_capacity:
            return jsonify({"error": "Room is already full"}), 400

        receipt_url = None
        if file and file.filename:
            receipt_url = upload_to_cloudinary(file)

        db.session.add(Student(
            full_name=name,
            phone_number=phone,
            course_name=request.form.get('course', 'University of Mines and Tech'),
            payment_status='Pending',
            receipt_url=receipt_url,
            room_id=room.id
        ))
        db.session.commit()
        return jsonify({"message": "Booking submitted successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/upload-receipt', methods=['POST'])
def upload_receipt():
    try:
        student_name  = request.form.get('student_name')
        student_email = request.form.get('student_email')
        file          = request.files.get('receipt')

        if not file or not student_name:
            return jsonify({"success": False, "message": "Missing file or name"}), 400

        receipt_url = upload_to_cloudinary(file)

        db.session.add(Receipt(
            student_name=student_name,
            student_email=student_email,
            receipt_url=receipt_url,
            status='Pending'
        ))
        db.session.commit()
        return jsonify({"success": True, "message": "Receipt uploaded successfully!", "url": receipt_url})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/accept-student/<int:student_id>', methods=['POST'])
def accept_student(student_id):
    student = db.session.get(Student, student_id)
    if student:
        student.payment_status = 'Paid'
        db.session.commit()
        return jsonify({"message": "Payment verified!"})
    return jsonify({"error": "Student not found"}), 404

@app.route('/api/students/<int:id>', methods=['DELETE'])
def delete_student_record(id):
    try:
        target = db.session.get(Student, id)
        if not target:
            return jsonify({"success": False, "message": "Student not found"}), 404
        name = target.full_name   # capture before deletion
        db.session.delete(target)
        db.session.commit()
        return jsonify({"success": True, "message": f"Record for {name} deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
