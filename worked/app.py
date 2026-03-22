from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import cloudinary
import cloudinary.uploader
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- CONFIGURATION ---
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'postgresql://postgres:harvesters1@localhost:5432/hostel_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'

# --- CLOUDINARY ---
cloudinary.config(
    cloud_name="decyikrrc",
    api_key="359759534989986",
    api_secret="t_Ch8-IamrAQ119dA7m6guuyYDk",
    secure=True
)

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db = SQLAlchemy(app)

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
    id          = db.Column(db.Integer, primary_key=True)
    room_number = db.Column(db.String(10), unique=True)
    room_type   = db.Column(db.String(20))   # Block A / Block B / Block C
    block       = db.Column(db.String(5))    # A / B / C
    status      = db.Column(db.String(20), default='Available')
    max_capacity= db.Column(db.Integer)
    students    = db.relationship('Student', backref='room_assigned', lazy=True)

class Student(db.Model):
    __tablename__ = 'students'
    id             = db.Column(db.Integer, primary_key=True)
    full_name      = db.Column(db.String(100))
    phone_number   = db.Column(db.String(15))
    program        = db.Column(db.String(150))   # NEW: student's program/course
    academic_year  = db.Column(db.String(10))    # NEW: e.g. 2023, 2024
    payment_status = db.Column(db.String(20), default='Pending')
    receipt_url    = db.Column(db.String(500))
    room_id        = db.Column(db.Integer, db.ForeignKey('rooms.id'))

class Receipt(db.Model):
    __tablename__ = 'receipts'
    id            = db.Column(db.Integer, primary_key=True)
    student_name  = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(100), nullable=False)
    receipt_url   = db.Column(db.String(500), nullable=False)
    status        = db.Column(db.String(20), default='Pending')

# --- DATABASE INITIALIZATION ---
with app.app_context():
    db.create_all()

    # Seed admin
    if not User.query.filter_by(email='admin@hostel.com').first():
        db.session.add(User(
            fullname="System Admin",
            email="admin@hostel.com",
            password="admin123",
            role="admin"
        ))
        db.session.commit()
        print("Admin created!")

    # Seed rooms — clear and re-seed if block column is missing data
    if not Room.query.first():
        print("Seeding rooms...")

        # Block A — 4-person rooms, 12 rooms (A1–A12)
        for i in range(1, 13):
            db.session.add(Room(
                room_number=f"A{i}",
                room_type="Block A",
                block="A",
                max_capacity=4
            ))

        # Block B — 2-person rooms, 18 rooms (B1–B18)
        for i in range(1, 19):
            db.session.add(Room(
                room_number=f"B{i}",
                room_type="Block B",
                block="B",
                max_capacity=2
            ))

        # Block C — 3-person rooms, 6 rooms (C1–C6)
        for i in range(1, 7):
            db.session.add(Room(
                room_number=f"C{i}",
                room_type="Block C",
                block="C",
                max_capacity=3
            ))

        db.session.commit()
        print("Rooms seeded: 12×Block A (4-bed), 18×Block B (2-bed), 6×Block C (3-bed)")

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
        display_status = 'Occupied' if current_count >= r.max_capacity else 'Available'
        result.append({
            "id":       r.id,
            "number":   r.room_number,
            "type":     r.room_type,
            "block":    r.block,
            "status":   display_status,
            "students": current_count,
            "capacity": r.max_capacity
        })
    return jsonify(result)


@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        all_students = Student.query.all()
        result = []
        for s in all_students:
            result.append({
                "id":            s.id,
                "name":          s.full_name,
                "room":          s.room_assigned.room_number if s.room_assigned else "Unassigned",
                "block":         s.room_assigned.block if s.room_assigned else "—",
                "program":       s.program,         # NEW
                "academic_year": s.academic_year,   # NEW
                "status":        s.payment_status,
                "receipt":       s.receipt_url
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/book', methods=['POST'])
def book_room():
    try:
        name          = request.form.get('studentName')
        room_num      = request.form.get('roomNumber')
        phone         = request.form.get('phone')
        program       = request.form.get('program')        # NEW
        academic_year = request.form.get('academicYear')   # NEW
        file          = request.files.get('receipt')

        receipt_url = None
        if file:
            upload_result = cloudinary.uploader.upload(
                file,
                folder="hostel_receipts",
                resource_type="image",
                public_id=f"receipt_{secure_filename(name)}_{room_num}"
            )
            receipt_url = upload_result['secure_url']
            print(f"Cloudinary upload: {receipt_url}")

        room = Room.query.filter_by(room_number=room_num).first()
        db.session.add(Student(
            full_name=name,
            phone_number=phone,
            program=program,
            academic_year=academic_year,
            payment_status='Pending',
            receipt_url=receipt_url,
            room_id=room.id if room else None
        ))
        db.session.commit()
        return jsonify({"message": "Booking submitted", "receipt_url": receipt_url}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Booking error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/rooms/<int:room_id>/occupants', methods=['GET'])
def get_room_occupants(room_id):
    try:
        students = Student.query.filter_by(room_id=room_id).all()
        result = []
        for s in students:
            result.append({
                "id":            s.id,
                "name":          s.full_name,
                "program":       s.program,
                "academic_year": s.academic_year,
                "phone":         s.phone_number,
                "status":        s.payment_status
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/accept-student/<int:student_id>', methods=['POST'])
def accept_student(student_id):
    student = Student.query.get(student_id)
    if student:
        student.payment_status = 'Paid'
        db.session.commit()
        return jsonify({"message": "Payment verified!"})
    return jsonify({"error": "Student not found"}), 404


@app.route('/api/upload-receipt', methods=['POST'])
def upload_receipt():
    try:
        student_name  = request.form.get('student_name')
        student_email = request.form.get('student_email')
        file          = request.files.get('receipt')

        if not file or not student_name:
            return jsonify({"success": False, "message": "Missing file or name"}), 400

        upload_result = cloudinary.uploader.upload(file, folder="hostel_receipts", resource_type="image")
        receipt_url   = upload_result['secure_url']

        db.session.add(Receipt(
            student_name=student_name,
            student_email=student_email,
            receipt_url=receipt_url,
            status='Pending'
        ))
        db.session.commit()
        return jsonify({"success": True, "message": "Receipt uploaded!", "url": receipt_url})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/students/<int:id>', methods=['DELETE'])
def delete_student_record(id):
    try:
        target = Student.query.get(id)
        if not target:
            return jsonify({"success": False, "message": "Student not found"}), 404
        db.session.delete(target)
        db.session.commit()
        return jsonify({"success": True, "message": f"Record for {target.full_name} deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
