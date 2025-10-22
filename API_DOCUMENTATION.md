# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "count": 0  // For list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message"
}
```

## Status Codes

- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST requests
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication Endpoints

### Register User
Creates a new user account.

**Endpoint:** `POST /auth/register`

**Access:** Public (should be restricted to admin in production)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "student",
  "phone": "1234567890"
}
```

**Roles:** `admin`, `teacher`, `student`, `parent`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe",
    "token": "jwt_token"
  }
}
```

### Login
Authenticates a user and returns a JWT token.

**Endpoint:** `POST /auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe",
    "token": "jwt_token"
  }
}
```

### Get Current User
Gets the currently authenticated user's information.

**Endpoint:** `GET /auth/me`

**Access:** Private (all authenticated users)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "student",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890",
    "isActive": true
  }
}
```

---

## Student Endpoints

### List All Students
Gets a list of all students with optional filtering.

**Endpoint:** `GET /students`

**Access:** Admin, Teacher

**Query Parameters:**
- `grade` - Filter by grade (K, 1-12)
- `section` - Filter by section
- `status` - Filter by status (active, inactive, graduated, transferred)

**Example:** `GET /students?grade=10&section=A&status=active`

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [...]
}
```

### Get Single Student
Gets detailed information about a specific student.

**Endpoint:** `GET /students/:id`

**Access:** Admin, Teacher, Student (themselves), Parent

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student_id",
    "user": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "1234567890"
    },
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
    },
    "enrollmentDate": "2023-08-15",
    "status": "active",
    "courses": [...],
    "parents": [...]
  }
}
```

### Create Student
Creates a new student account and profile.

**Endpoint:** `POST /students`

**Access:** Admin

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "1234567890",
  "studentId": "STU001",
  "dateOfBirth": "2010-05-15",
  "gender": "female",
  "grade": "10",
  "section": "A",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA"
  },
  "medicalInfo": {
    "allergies": ["Peanuts"],
    "medications": [],
    "emergencyContact": {
      "name": "John Smith",
      "relationship": "Father",
      "phone": "9876543210"
    }
  }
}
```

### Update Student
Updates an existing student's information.

**Endpoint:** `PUT /students/:id`

**Access:** Admin

**Request Body:** (same as create, all fields optional)

### Delete Student
Deactivates a student (soft delete).

**Endpoint:** `DELETE /students/:id`

**Access:** Admin

**Response:**
```json
{
  "success": true,
  "message": "Student deactivated successfully"
}
```

---

## Teacher Endpoints

### List All Teachers
Gets a list of all teachers with optional filtering.

**Endpoint:** `GET /teachers`

**Access:** Admin, Teacher

**Query Parameters:**
- `department` - Filter by department
- `status` - Filter by status (active, on-leave, terminated)

**Example:** `GET /teachers?department=Mathematics&status=active`

### Get Single Teacher
Gets detailed information about a specific teacher.

**Endpoint:** `GET /teachers/:id`

**Access:** Admin, Teacher (themselves)

### Create Teacher
Creates a new teacher account and profile.

**Endpoint:** `POST /teachers`

**Access:** Admin

**Request Body:**
```json
{
  "email": "teacher@example.com",
  "password": "password123",
  "firstName": "Robert",
  "lastName": "Johnson",
  "phone": "1234567890",
  "teacherId": "TCH001",
  "department": "Mathematics",
  "subjects": ["Algebra", "Calculus", "Geometry"],
  "qualifications": [
    {
      "degree": "Master of Science in Mathematics",
      "institution": "University of Illinois",
      "year": 2018
    },
    {
      "degree": "Bachelor of Science in Mathematics",
      "institution": "State University",
      "year": 2015
    }
  ],
  "hireDate": "2020-08-15",
  "salary": 65000,
  "address": {
    "street": "456 Oak St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA"
  }
}
```

### Update Teacher
Updates an existing teacher's information.

**Endpoint:** `PUT /teachers/:id`

**Access:** Admin

### Delete Teacher
Deactivates a teacher (soft delete).

**Endpoint:** `DELETE /teachers/:id`

**Access:** Admin

---

## Course Endpoints

### List All Courses
Gets a list of all courses with optional filtering.

**Endpoint:** `GET /courses`

**Access:** All authenticated users

**Query Parameters:**
- `grade` - Filter by grade
- `subject` - Filter by subject
- `teacher` - Filter by teacher ID
- `academicYear` - Filter by academic year
- `semester` - Filter by semester (Fall, Spring, Summer)
- `status` - Filter by status (active, completed, cancelled)

**Example:** `GET /courses?grade=10&subject=Mathematics&semester=Fall`

### Get Single Course
Gets detailed information about a specific course.

**Endpoint:** `GET /courses/:id`

**Access:** All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "course_id",
    "courseCode": "MATH101",
    "name": "Algebra I",
    "description": "Introduction to algebraic concepts",
    "grade": "10",
    "subject": "Mathematics",
    "teacher": {
      "id": "teacher_id",
      "user": {
        "firstName": "Robert",
        "lastName": "Johnson"
      }
    },
    "section": "A",
    "schedule": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "10:00",
        "room": "101"
      },
      {
        "day": "Wednesday",
        "startTime": "09:00",
        "endTime": "10:00",
        "room": "101"
      }
    ],
    "students": [...],
    "maxStudents": 30,
    "academicYear": "2023-2024",
    "semester": "Fall",
    "status": "active"
  }
}
```

### Create Course
Creates a new course.

**Endpoint:** `POST /courses`

**Access:** Admin

**Request Body:**
```json
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

### Update Course
Updates an existing course.

**Endpoint:** `PUT /courses/:id`

**Access:** Admin, Teacher (who owns the course)

### Enroll Student in Course
Enrolls a student in a specific course.

**Endpoint:** `POST /courses/:id/enroll`

**Access:** Admin

**Request Body:**
```json
{
  "studentId": "student_id"
}
```

### Delete Course
Deletes a course.

**Endpoint:** `DELETE /courses/:id`

**Access:** Admin

---

## Attendance Endpoints

### List Attendance Records
Gets attendance records with optional filtering.

**Endpoint:** `GET /attendance`

**Access:** Admin, Teacher

**Query Parameters:**
- `student` - Filter by student ID
- `course` - Filter by course ID
- `startDate` - Filter by start date (YYYY-MM-DD)
- `endDate` - Filter by end date (YYYY-MM-DD)
- `status` - Filter by status (present, absent, late, excused)

**Example:** `GET /attendance?student=student_id&startDate=2024-01-01&endDate=2024-01-31`

### Get Student Attendance
Gets all attendance records for a specific student with statistics.

**Endpoint:** `GET /attendance/student/:studentId`

**Access:** Admin, Teacher, Student (themselves), Parent

**Response:**
```json
{
  "success": true,
  "data": [...],
  "statistics": {
    "total": 100,
    "present": 85,
    "absent": 10,
    "late": 5,
    "excused": 0,
    "attendanceRate": "90.00%"
  }
}
```

### Mark Attendance
Creates an attendance record.

**Endpoint:** `POST /attendance`

**Access:** Admin, Teacher

**Request Body:**
```json
{
  "student": "student_id",
  "course": "course_id",
  "date": "2024-01-15",
  "status": "present",
  "remarks": "On time"
}
```

**Status Options:** `present`, `absent`, `late`, `excused`

### Update Attendance
Updates an existing attendance record.

**Endpoint:** `PUT /attendance/:id`

**Access:** Admin, Teacher

### Delete Attendance
Deletes an attendance record.

**Endpoint:** `DELETE /attendance/:id`

**Access:** Admin

---

## Grade Endpoints

### List Grades
Gets grade records with optional filtering.

**Endpoint:** `GET /grades`

**Access:** Admin, Teacher

**Query Parameters:**
- `student` - Filter by student ID
- `course` - Filter by course ID
- `assessmentType` - Filter by type

**Example:** `GET /grades?student=student_id&course=course_id`

### Get Student Grades
Gets all grades for a specific student with statistics.

**Endpoint:** `GET /grades/student/:studentId`

**Access:** Admin, Teacher, Student (themselves), Parent

**Query Parameters:**
- `course` - Optional course filter

**Response:**
```json
{
  "success": true,
  "data": [...],
  "statistics": {
    "totalGrades": 25,
    "overallPercentage": "87.50%",
    "courseBreakdown": [
      {
        "course": {...},
        "grades": [...],
        "totalScore": 875,
        "totalMaxScore": 1000,
        "percentage": "87.50"
      }
    ]
  }
}
```

### Get Course Grades
Gets all grades for a specific course.

**Endpoint:** `GET /grades/course/:courseId`

**Access:** Admin, Teacher (who teaches the course)

### Create Grade
Creates a new grade record.

**Endpoint:** `POST /grades`

**Access:** Admin, Teacher

**Request Body:**
```json
{
  "student": "student_id",
  "course": "course_id",
  "assessmentType": "test",
  "title": "Midterm Exam",
  "score": 85,
  "maxScore": 100,
  "weight": 1,
  "dueDate": "2024-01-15",
  "submittedDate": "2024-01-15",
  "comments": "Well done!"
}
```

**Assessment Types:** `homework`, `quiz`, `test`, `midterm`, `final`, `project`, `participation`

**Note:** Percentage and letter grade are calculated automatically.

### Update Grade
Updates an existing grade.

**Endpoint:** `PUT /grades/:id`

**Access:** Admin, Teacher (who created it)

### Delete Grade
Deletes a grade record.

**Endpoint:** `DELETE /grades/:id`

**Access:** Admin, Teacher (who created it)

---

## Parent Endpoints

### List All Parents
Gets a list of all parents.

**Endpoint:** `GET /parents`

**Access:** Admin

### Get Parent Dashboard
Gets comprehensive information about parent's children including grades and attendance.

**Endpoint:** `GET /parents/dashboard`

**Access:** Parent

**Response:**
```json
{
  "success": true,
  "data": {
    "parent": {...},
    "children": [
      {
        "student": {...},
        "recentGrades": [...],
        "recentAttendance": [...],
        "attendanceRate": "92.00%"
      }
    ]
  }
}
```

### Create Parent
Creates a new parent account and profile.

**Endpoint:** `POST /parents`

**Access:** Admin

**Request Body:**
```json
{
  "email": "parent@example.com",
  "password": "password123",
  "firstName": "Michael",
  "lastName": "Smith",
  "phone": "1234567890",
  "relationship": "father",
  "occupation": "Engineer",
  "employer": "Tech Corp",
  "workPhone": "9876543210",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA"
  },
  "children": ["student_id_1", "student_id_2"]
}
```

**Relationship Options:** `mother`, `father`, `guardian`, `other`

### Update Parent
Updates an existing parent's information.

**Endpoint:** `PUT /parents/:id`

**Access:** Admin, Parent (themselves)

---

## Admin Endpoints

### Get Dashboard Statistics
Gets comprehensive system statistics.

**Endpoint:** `GET /admin/dashboard`

**Access:** Admin

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalStudents": 500,
      "totalTeachers": 50,
      "totalCourses": 100,
      "totalParents": 450,
      "recentEnrollments": 25
    },
    "attendanceStats": {
      "total": 3500,
      "present": 3200,
      "absent": 200,
      "late": 100,
      "excused": 0
    },
    "studentsByGrade": [...],
    "coursesBySubject": [...],
    "recentGrades": [...]
  }
}
```

### Get Attendance Report
Gets comprehensive attendance report with statistics.

**Endpoint:** `GET /admin/reports/attendance`

**Access:** Admin

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `grade` - Filter by grade
- `section` - Filter by section

**Example:** `GET /admin/reports/attendance?startDate=2024-01-01&endDate=2024-01-31&grade=10`

### Get Grades Report
Gets comprehensive grades report with statistics.

**Endpoint:** `GET /admin/reports/grades`

**Access:** Admin

**Query Parameters:**
- `course` - Filter by course ID
- `grade` - Filter by grade level
- `assessmentType` - Filter by assessment type

**Example:** `GET /admin/reports/grades?course=course_id&assessmentType=test`

---

## Error Codes

### 400 Bad Request
- Invalid input data
- Validation errors
- Duplicate records (e.g., student already enrolled in course)

### 401 Unauthorized
- Missing authentication token
- Invalid or expired token
- Inactive user account

### 403 Forbidden
- Insufficient permissions for the requested action
- User role doesn't have access to the endpoint

### 404 Not Found
- Requested resource doesn't exist
- Invalid ID in URL

### 500 Internal Server Error
- Database connection issues
- Unexpected server errors

---

## Rate Limiting

Consider implementing rate limiting in production:
- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (httpOnly cookies recommended)
3. **Implement token refresh** mechanism for long sessions
4. **Validate all input** on the client side before sending
5. **Handle errors gracefully** with user-friendly messages
6. **Log API calls** for audit purposes
7. **Use pagination** for large datasets (to be implemented)
