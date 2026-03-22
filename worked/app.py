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

# --- CLOUDINARY CONFIGURATION ---
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
    receipt_url = db.Column(db.String(500))  # stores full Cloudinary https:// URL
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'))

class Receipt(db.Model):
    __tablename__ = 'receipts'
    id = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(100), nullable=False)
    student_email = db.Column(db.String(100), nullable=False)
    receipt_url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default='Pending')  # Pending, Approved, Declined

# --- DATABASE INITIALIZATION ---
with app.app_context():
    db.create_all()

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

    if not Room.query.first():
        print("Seeding rooms...")
        for i in range(1, 19):
            db.session.add(Room(room_number=f"M{i}", room_type="Male", max_capacity=4))
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
    try:
        all_students = Student.query.all()
        result = []
        for s in all_students:
            result.append({
                "id": s.id,
                "name": s.full_name,
                "room": s.room_assigned.room_number if s.room_assigned else "Unassigned",
                "course": s.course_name,
                "status": s.payment_status,
                "receipt": s.receipt_url  # full Cloudinary URL — React reads this directly
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/book', methods=['POST'])
def book_room():
    try:
        name = request.form.get('studentName')
        room_num = request.form.get('roomNumber')
        file = request.files.get('receipt')

        receipt_url = None
        if file:
            # Upload directly to Cloudinary — permanent URL, never deleted
            upload_result = cloudinary.uploader.upload(
                file,
                folder="hostel_receipts",        # organises uploads in Cloudinary
                resource_type="image",
                public_id=f"receipt_{secure_filename(name)}_{room_num}"
            )
            receipt_url = upload_result['secure_url']
            print(f"Cloudinary upload success: {receipt_url}")

        room = Room.query.filter_by(room_number=room_num).first()
        new_student = Student(
            full_name=name,
            phone_number=request.form.get('phone'),
            course_name=request.form.get('course', 'University of Mines and Tech'),
            payment_status='Pending',
            receipt_url=receipt_url,  # full https://res.cloudinary.com/... URL
            room_id=room.id if room else None
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify({"message": "Booking submitted", "receipt_url": receipt_url}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Booking error: {str(e)}")
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
        student_name = request.form.get('student_name')
        student_email = request.form.get('student_email')
        file = request.files.get('receipt')

        if not file or not student_name:
            return jsonify({"success": False, "message": "Missing file or name"}), 400

        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            file,
            folder="hostel_receipts",
            resource_type="image"
        )
        receipt_url = upload_result['secure_url']

        new_receipt = Receipt(
            student_name=student_name,
            student_email=student_email,
            receipt_url=receipt_url,
            status='Pending'
        )
        db.session.add(new_receipt)
        db.session.commit()

        return jsonify({"success": True, "message": "Receipt uploaded successfully!", "url": receipt_url})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/students/<int:id>', methods=['DELETE'])
def delete_student_record(id):
    try:
        target_student = Student.query.get(id)

        if not target_student:
            return jsonify({"success": False, "message": "Student not found in database"}), 404

        db.session.delete(target_student)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Record for {target_student.full_name} deleted."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# Kept for local dev fallback only — Cloudinary handles production uploads
@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
