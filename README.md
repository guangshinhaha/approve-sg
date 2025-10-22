# K-12 School Management System

A comprehensive, full-stack school management system designed for K-12 educational institutions. This system provides robust features for managing students, teachers, courses, attendance, grades, and parent communication.

## Features

### Core Modules

1. **Student Management**
   - Complete student profiles with personal and academic information
   - Medical information and emergency contacts
   - Enrollment tracking and status management
   - Grade level management (K-12)
   - Course enrollment and history

2. **Teacher Management**
   - Teacher profiles with qualifications and experience
   - Department and subject assignments
   - Course assignments and schedules
   - Employment status tracking

3. **Course Management**
   - Course creation and scheduling
   - Student enrollment management
   - Teacher assignments
   - Academic year and semester tracking
   - Class size limits and sections

4. **Attendance Tracking**
   - Daily attendance marking
   - Multiple status types (present, absent, late, excused)
   - Attendance reports and statistics
   - Course-specific attendance tracking

5. **Grade Management**
   - Multiple assessment types (homework, quiz, test, midterm, final, project)
   - Automatic percentage and letter grade calculation
   - Weighted grading system
   - Course-specific grade tracking
   - Student performance analytics

6. **Parent Portal**
   - View children's academic performance
   - Monitor attendance records
   - Access course information
   - Real-time updates on student progress

7. **Admin Dashboard**
   - System-wide statistics and analytics
   - Attendance and grade reports
   - Student and teacher management
   - Comprehensive reporting tools

### Security Features

- JWT-based authentication
- Role-based access control (Admin, Teacher, Student, Parent)
- Password hashing with bcrypt
- Protected API endpoints
- User authorization middleware

## Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

### Security & Validation
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd k12-school-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update the following variables:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/school_management
   JWT_SECRET=your_secure_jwt_secret_here
   JWT_EXPIRE=30d
   ```

4. **Start MongoDB**
   ```bash
   # On Linux/Mac
   sudo systemctl start mongod

   # Or using MongoDB directly
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode (with auto-restart)
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the API**
   - The server will run on `http://localhost:5000`
   - API endpoints are available at `http://localhost:5000/api/*`

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "phone": "1234567890"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Student Endpoints

#### Get All Students
```http
GET /api/students?grade=10&section=A&status=active
Authorization: Bearer <admin_or_teacher_token>
```

#### Get Single Student
```http
GET /api/students/:id
Authorization: Bearer <token>
```

#### Create Student
```http
POST /api/students
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "studentId": "STU001",
  "dateOfBirth": "2010-05-15",
  "gender": "female",
  "grade": "10",
  "section": "A",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701"
  }
}
```

#### Update Student
```http
PUT /api/students/:id
Authorization: Bearer <admin_token>
Content-Type: application/json
```

#### Delete Student
```http
DELETE /api/students/:id
Authorization: Bearer <admin_token>
```

### Teacher Endpoints

#### Get All Teachers
```http
GET /api/teachers?department=Mathematics&status=active
Authorization: Bearer <admin_or_teacher_token>
```

#### Create Teacher
```http
POST /api/teachers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "teacher@example.com",
  "password": "password123",
  "firstName": "Robert",
  "lastName": "Johnson",
  "teacherId": "TCH001",
  "department": "Mathematics",
  "subjects": ["Algebra", "Calculus"],
  "hireDate": "2020-08-15",
  "qualifications": [
    {
      "degree": "Master of Science",
      "institution": "University of Illinois",
      "year": 2018
    }
  ]
}
```

### Course Endpoints

#### Get All Courses
```http
GET /api/courses?grade=10&subject=Mathematics
Authorization: Bearer <token>
```

#### Create Course
```http
POST /api/courses
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "courseCode": "MATH101",
  "name": "Algebra I",
  "description": "Introduction to algebraic concepts",
  "grade": "10",
  "subject": "Mathematics",
  "teacher": "teacher_id",
  "section": "A",
  "schedule": [
    {
      "day": "Monday",
      "startTime": "09:00",
      "endTime": "10:00",
      "room": "101"
    }
  ],
  "academicYear": "2023-2024",
  "semester": "Fall",
  "maxStudents": 30
}
```

#### Enroll Student in Course
```http
POST /api/courses/:id/enroll
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "studentId": "student_id"
}
```

### Attendance Endpoints

#### Get Attendance Records
```http
GET /api/attendance?student=student_id&course=course_id
Authorization: Bearer <admin_or_teacher_token>
```

#### Get Student Attendance
```http
GET /api/attendance/student/:studentId
Authorization: Bearer <token>
```

#### Mark Attendance
```http
POST /api/attendance
Authorization: Bearer <admin_or_teacher_token>
Content-Type: application/json

{
  "student": "student_id",
  "course": "course_id",
  "date": "2024-01-15",
  "status": "present",
  "remarks": "On time"
}
```

### Grade Endpoints

#### Get Grades
```http
GET /api/grades?student=student_id&course=course_id
Authorization: Bearer <admin_or_teacher_token>
```

#### Get Student Grades
```http
GET /api/grades/student/:studentId
Authorization: Bearer <token>
```

#### Create Grade
```http
POST /api/grades
Authorization: Bearer <admin_or_teacher_token>
Content-Type: application/json

{
  "student": "student_id",
  "course": "course_id",
  "assessmentType": "test",
  "title": "Midterm Exam",
  "score": 85,
  "maxScore": 100,
  "weight": 1,
  "dueDate": "2024-01-15"
}
```

### Parent Endpoints

#### Get Parent Dashboard
```http
GET /api/parents/dashboard
Authorization: Bearer <parent_token>
```

#### Create Parent
```http
POST /api/parents
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "parent@example.com",
  "password": "password123",
  "firstName": "Michael",
  "lastName": "Smith",
  "phone": "1234567890",
  "relationship": "father",
  "children": ["student_id_1", "student_id_2"]
}
```

### Admin Endpoints

#### Get Dashboard Statistics
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

#### Get Attendance Report
```http
GET /api/admin/reports/attendance?startDate=2024-01-01&endDate=2024-01-31&grade=10
Authorization: Bearer <admin_token>
```

#### Get Grades Report
```http
GET /api/admin/reports/grades?course=course_id&assessmentType=test
Authorization: Bearer <admin_token>
```

## User Roles

### Admin
- Full system access
- Manage all users (students, teachers, parents)
- Create and manage courses
- View all reports and analytics
- System configuration

### Teacher
- View assigned courses
- Mark attendance for their courses
- Enter and manage grades
- View student information in their courses
- Access course materials

### Student
- View own profile
- View enrolled courses
- Check grades and attendance
- View course schedules

### Parent
- View children's information
- Monitor academic performance
- Check attendance records
- View course information

## Database Schema

### Collections

1. **Users** - Base authentication for all user types
2. **Students** - Student-specific information
3. **Teachers** - Teacher-specific information
4. **Parents** - Parent-specific information
5. **Courses** - Course definitions and schedules
6. **Attendance** - Attendance records
7. **Grades** - Grade and assessment records

### Relationships

- User → Student/Teacher/Parent (one-to-one)
- Teacher → Courses (one-to-many)
- Student → Courses (many-to-many)
- Student → Attendance (one-to-many)
- Student → Grades (one-to-many)
- Parent → Students (one-to-many)
- Course → Attendance (one-to-many)
- Course → Grades (one-to-many)

## Development

### Project Structure
```
k12-school-management-system/
├── models/           # Mongoose models
│   ├── User.js
│   ├── Student.js
│   ├── Teacher.js
│   ├── Course.js
│   ├── Attendance.js
│   ├── Grade.js
│   └── Parent.js
├── routes/           # API routes
│   ├── auth.js
│   ├── students.js
│   ├── teachers.js
│   ├── courses.js
│   ├── attendance.js
│   ├── grades.js
│   ├── parents.js
│   └── admin.js
├── middleware/       # Custom middleware
│   └── auth.js
├── utils/           # Utility functions
│   └── generateToken.js
├── server.js        # Main application file
├── package.json     # Dependencies
├── .env.example     # Environment variables template
└── README.md        # Documentation
```

### Adding New Features

1. Create model in `models/` directory
2. Create routes in `routes/` directory
3. Add middleware if needed in `middleware/`
4. Register routes in `server.js`
5. Update documentation

## Testing

### Manual Testing with cURL

#### Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"admin123"}'
```

#### Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email":"student@school.com",
    "password":"student123",
    "firstName":"John",
    "lastName":"Doe",
    "studentId":"STU001",
    "dateOfBirth":"2010-05-15",
    "gender":"male",
    "grade":"10",
    "section":"A"
  }'
```

## Security Considerations

1. **Always change default credentials** in production
2. **Use strong JWT secrets** (at least 32 characters)
3. **Enable HTTPS** in production
4. **Implement rate limiting** to prevent abuse
5. **Regular security audits** of dependencies
6. **Input validation** on all endpoints
7. **Sanitize user input** to prevent injection attacks

## Deployment

### Production Checklist

- [ ] Update `NODE_ENV=production` in `.env`
- [ ] Use secure MongoDB connection (MongoDB Atlas or secured instance)
- [ ] Generate strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Set up proper CORS origins
- [ ] Configure proper logging
- [ ] Set up automated backups
- [ ] Implement monitoring and alerts

### Deployment Platforms

- **Heroku**: Easy deployment with MongoDB Atlas
- **AWS**: EC2 + MongoDB Atlas or DocumentDB
- **DigitalOcean**: Droplet + managed MongoDB
- **Railway**: Simple deployment with databases

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Roadmap

### Future Features

- [ ] Email notifications for parents
- [ ] SMS alerts for attendance
- [ ] Online assignment submission
- [ ] Discussion forums
- [ ] Calendar integration
- [ ] Report card generation
- [ ] Financial management (fees, payments)
- [ ] Library management
- [ ] Transportation management
- [ ] Cafeteria management
- [ ] Mobile application (iOS/Android)
- [ ] Real-time chat between teachers and parents
- [ ] Video conferencing integration
- [ ] Advanced analytics and insights

## Acknowledgments

Built with modern web technologies and best practices for educational institutions.
