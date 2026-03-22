from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from datetime import datetime
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
app.config['SECRET_KEY']    = os.environ.get('SECRET_KEY', 'hostel-secret-key-2024')

# --- FLASK-MAIL (port 465 + SSL — works on Render free tier) ---
app.config['MAIL_SERVER']         = 'smtp.gmail.com'
app.config['MAIL_PORT']           = 465
app.config['MAIL_USE_TLS']        = False
app.config['MAIL_USE_SSL']        = True
app.config['MAIL_USERNAME']       = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD']       = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# --- CLOUDINARY ---
cloudinary.config(
    cloud_name="decyikrrc",
    api_key="359759534989986",
    api_secret="t_Ch8-IamrAQ119dA7m6guuyYDk",
    secure=True
)

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db   = SQLAlchemy(app)
mail = Mail(app)
s    = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# --- MODELS ---

class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    fullname      = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(100), unique=True, nullable=False)
    password      = db.Column(db.String(255), nullable=True)
    role          = db.Column(db.String(20), default='student')
    is_verified   = db.Column(db.Boolean, default=False)
    auth_provider = db.Column(db.String(20), default='email')
    google_id     = db.Column(db.String(100), nullable=True)
    profile_pic   = db.Column(db.String(500), nullable=True)

class Room(db.Model):
    __tablename__ = 'rooms'
    id           = db.Column(db.Integer, primary_key=True)
    room_number  = db.Column(db.String(10), unique=True)
    room_type    = db.Column(db.String(20))
    block        = db.Column(db.String(5))
    status       = db.Column(db.String(20), default='Available')
    max_capacity = db.Column(db.Integer)
    students     = db.relationship('Student', backref='room_assigned', lazy=True)

class Student(db.Model):
    __tablename__ = 'students'
    id             = db.Column(db.Integer, primary_key=True)
    full_name      = db.Column(db.String(100))
    phone_number   = db.Column(db.String(15))
    program        = db.Column(db.String(150))
    academic_year  = db.Column(db.String(10))
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

class Complaint(db.Model):
    __tablename__ = 'complaints'
    id           = db.Column(db.Integer, primary_key=True)
    student_name = db.Column(db.String(100), nullable=False)
    room_number  = db.Column(db.String(10))
    message      = db.Column(db.Text, nullable=False)
    status       = db.Column(db.String(20), default='Open')
    admin_reply  = db.Column(db.Text, nullable=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    replied_at   = db.Column(db.DateTime, nullable=True)

# --- DATABASE INITIALIZATION ---
with app.app_context():
    db.create_all()

    if not User.query.filter_by(email='admin@hostel.com').first():
        db.session.add(User(
            fullname="System Admin",
            email="admin@hostel.com",
            password="admin123",
            role="admin",
            is_verified=True,
            auth_provider='email'
        ))
        db.session.commit()
        print("Admin created!")

    if not Room.query.first():
        print("Seeding rooms...")
        for i in range(1, 13):
            db.session.add(Room(room_number=f"A{i}", room_type="Block A", block="A", max_capacity=4))
        for i in range(1, 19):
            db.session.add(Room(room_number=f"B{i}", room_type="Block B", block="B", max_capacity=2))
        for i in range(1, 7):
            db.session.add(Room(room_number=f"C{i}", room_type="Block C", block="C", max_capacity=3))
        db.session.commit()
        print("Seeded: 12×Block A (4-bed), 18×Block B (2-bed), 6×Block C (3-bed)")

# --- HELPER: send verification email ---
def send_verification_email(user):
    try:
        token      = s.dumps(user.email, salt='email-verify-salt')
        verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
        msg        = Message(subject="HostelHub — Verify Your Email", recipients=[user.email])
        msg.html   = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #1e40af; font-size: 24px; margin: 0;">HostelHub</h1>
                <p style="color: #64748b; font-size: 13px; margin-top: 4px;">University of Mines & Technology</p>
            </div>
            <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Verify Your Email Address</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    Hi <strong>{user.fullname}</strong>,<br><br>
                    Welcome to HostelHub! Please verify your email address to activate your account.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="{verify_url}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                        Verify My Email
                    </a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
                    This link expires in <strong>24 hours</strong>.
                </p>
            </div>
        </div>
        """
        mail.send(msg)
        print(f"Verification email sent to {user.email}")
        return True
    except Exception as e:
        print(f"Mail send error: {str(e)}")
        return False

# --- AUTH ROUTES ---

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data  = request.json
        email = data.get('email', '').strip().lower()

        if User.query.filter_by(email=email).first():
            return jsonify({"success": False, "message": "This email is already registered. Please log in instead."}), 400

        new_user = User(
            fullname=data.get('fullname'),
            email=email,
            password=data.get('password'),
            role='student',
            is_verified=False,
            auth_provider='email'
        )
        db.session.add(new_user)
        db.session.commit()

        email_sent = send_verification_email(new_user)

        return jsonify({
            "success":    True,
            "message":    "Account created! Please check your email to verify." if email_sent else "Account created! Verification email could not be sent — contact admin.",
            "email_sent": email_sent
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Signup error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data  = request.json
        email = data.get('email', '').strip().lower()
        user  = User.query.filter_by(email=email).first()

        if not user or user.password != data.get('password'):
            return jsonify({"success": False, "message": "Invalid email or password."}), 401

        if user.auth_provider == 'google':
            return jsonify({"success": False, "message": "This account uses Google Sign-In. Please click 'Continue with Google'."}), 403

        if not user.is_verified:
            return jsonify({
                "success":      False,
                "message":      "Please verify your email before logging in. Check your inbox.",
                "not_verified": True,
                "email":        user.email
            }), 403

        return jsonify({
            "success":     True,
            "user_name":   user.fullname,
            "role":        user.role,
            "profile_pic": user.profile_pic
        }), 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# --- GOOGLE SIGN-IN (token decoded on frontend, no outbound request needed) ---
@app.route('/api/google-auth', methods=['POST'])
def google_auth():
    try:
        data        = request.json
        email       = data.get('email', '').strip().lower()
        fullname    = data.get('fullname', '')
        google_id   = data.get('google_id', '')
        profile_pic = data.get('profile_pic', '')

        if not email:
            return jsonify({"success": False, "message": "No email provided"}), 400

        user = User.query.filter_by(email=email).first()

        if user:
            # Existing user — update Google info and log in
            user.google_id   = google_id
            user.profile_pic = profile_pic
            user.is_verified = True
            if user.auth_provider == 'email':
                user.auth_provider = 'both'
            db.session.commit()
        else:
            # New user — create account automatically
            user = User(
                fullname=fullname,
                email=email,
                password=None,
                role='student',
                is_verified=True,
                auth_provider='google',
                google_id=google_id,
                profile_pic=profile_pic
            )
            db.session.add(user)
            db.session.commit()

        return jsonify({
            "success":     True,
            "user_name":   user.fullname,
            "role":        user.role,
            "profile_pic": user.profile_pic
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Google auth error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/verify-email', methods=['POST'])
def verify_email():
    try:
        token = request.json.get('token')
        try:
            email = s.loads(token, salt='email-verify-salt', max_age=86400)
        except SignatureExpired:
            return jsonify({"success": False, "message": "Verification link has expired. Please request a new one."}), 400
        except BadSignature:
            return jsonify({"success": False, "message": "Invalid verification link."}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "message": "Account not found."}), 404
        if user.is_verified:
            return jsonify({"success": True, "message": "Email already verified. You can log in.", "already_verified": True}), 200

        user.is_verified = True
        db.session.commit()
        return jsonify({"success": True, "message": "Email verified successfully! You can now log in."}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/resend-verification', methods=['POST'])
def resend_verification():
    try:
        email = request.json.get('email', '').strip().lower()
        user  = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "message": "No account found with that email."}), 404
        if user.is_verified:
            return jsonify({"success": False, "message": "This email is already verified."}), 400
        sent = send_verification_email(user)
        if sent:
            return jsonify({"success": True, "message": "Verification email resent!"}), 200
        else:
            return jsonify({"success": False, "message": "Failed to send email. Please try again."}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        email = request.json.get('email', '').strip().lower()
        user  = User.query.filter_by(email=email).first()

        print(f"Forgot password for: {email}")
        print(f"User found: {user is not None}")
        if user:
            print(f"Is verified: {user.is_verified}")
            print(f"Auth provider: {user.auth_provider}")

        if user and user.is_verified and user.auth_provider != 'google':
            token      = s.dumps(email, salt='password-reset-salt')
            reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
            msg        = Message(subject="HostelHub — Reset Your Password", recipients=[email])
            msg.html   = f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1e40af; font-size: 24px; margin: 0;">HostelHub</h1>
                    <p style="color: #64748b; font-size: 13px; margin-top: 4px;">University of Mines & Technology</p>
                </div>
                <div style="background: white; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Hi <strong>{user.fullname}</strong>,<br><br>
                        Click the button below to reset your password. This link expires in 30 minutes.
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                        <a href="{reset_link}" style="background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                            Reset My Password
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
                        This link expires in <strong>30 minutes</strong>. If you didn't request this, ignore this email.
                    </p>
                </div>
            </div>
            """
            try:
                mail.send(msg)
                print(f"Reset email sent to {email}")
            except Exception as mail_err:
                print(f"Reset email failed: {str(mail_err)}")

        return jsonify({"success": True, "message": "If that email is registered and verified, a reset link has been sent."}), 200

    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        token    = request.json.get('token')
        password = request.json.get('password')
        try:
            email = s.loads(token, salt='password-reset-salt', max_age=1800)
        except SignatureExpired:
            return jsonify({"success": False, "message": "Reset link has expired. Please request a new one."}), 400
        except BadSignature:
            return jsonify({"success": False, "message": "Invalid reset link."}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404
        user.password = password
        db.session.commit()
        return jsonify({"success": True, "message": "Password reset successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --- ROOM ROUTES ---
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    result = []
    for r in Room.query.all():
        current_count  = Student.query.filter_by(room_id=r.id, payment_status='Paid').count()
        display_status = 'Occupied' if current_count >= r.max_capacity else 'Available'
        result.append({
            "id": r.id, "number": r.room_number, "type": r.room_type,
            "block": r.block, "status": display_status,
            "students": current_count, "capacity": r.max_capacity
        })
    return jsonify(result)


@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        result = []
        for s in Student.query.all():
            result.append({
                "id":            s.id,
                "name":          s.full_name,
                "room":          s.room_assigned.room_number if s.room_assigned else "Unassigned",
                "block":         s.room_assigned.block if s.room_assigned else "—",
                "program":       s.program,
                "academic_year": s.academic_year,
                "phone":         s.phone_number,
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
        program       = request.form.get('program')
        academic_year = request.form.get('academicYear')
        file          = request.files.get('receipt')

        receipt_url = None
        if file:
            upload_result = cloudinary.uploader.upload(
                file, folder="hostel_receipts", resource_type="image",
                public_id=f"receipt_{secure_filename(name)}_{room_num}"
            )
            receipt_url = upload_result['secure_url']

        room = Room.query.filter_by(room_number=room_num).first()
        db.session.add(Student(
            full_name=name, phone_number=phone, program=program,
            academic_year=academic_year, payment_status='Pending',
            receipt_url=receipt_url, room_id=room.id if room else None
        ))
        db.session.commit()
        return jsonify({"message": "Booking submitted", "receipt_url": receipt_url}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/rooms/<int:room_id>/occupants', methods=['GET'])
def get_room_occupants(room_id):
    try:
        result = []
        for s in Student.query.filter_by(room_id=room_id).all():
            result.append({
                "id": s.id, "name": s.full_name, "program": s.program,
                "academic_year": s.academic_year, "phone": s.phone_number,
                "status": s.payment_status
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


# --- COMPLAINT ROUTES ---
@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    try:
        result = []
        for c in Complaint.query.order_by(Complaint.created_at.desc()).all():
            result.append({
                "id": c.id, "student_name": c.student_name,
                "room_number": c.room_number, "message": c.message,
                "status": c.status, "admin_reply": c.admin_reply,
                "created_at": c.created_at.strftime('%d %b %Y, %H:%M') if c.created_at else None,
                "replied_at": c.replied_at.strftime('%d %b %Y, %H:%M') if c.replied_at else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    try:
        data = request.json
        db.session.add(Complaint(
            student_name=data.get('student_name'),
            room_number=data.get('room_number'),
            message=data.get('message'),
            status='Open'
        ))
        db.session.commit()
        return jsonify({"success": True, "message": "Complaint submitted!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/complaints/<int:complaint_id>/reply', methods=['POST'])
def reply_complaint(complaint_id):
    try:
        complaint = Complaint.query.get(complaint_id)
        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404
        data = request.json
        complaint.admin_reply = data.get('reply')
        complaint.status      = 'Replied'
        complaint.replied_at  = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "message": "Reply sent!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/api/complaints/<int:complaint_id>/resolve', methods=['POST'])
def resolve_complaint(complaint_id):
    try:
        complaint = Complaint.query.get(complaint_id)
        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404
        complaint.status = 'Resolved'
        db.session.commit()
        return jsonify({"success": True, "message": "Marked as resolved!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@app.route('/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
