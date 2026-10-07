# 🗳️ Voting Management System Backend

A secure, role-based RESTful API for an online voting management system built with **Node.js**, **Express.js**, and **MongoDB (Mongoose)**.

This project was built to demonstrate core backend engineering concepts: JWT authentication, password hashing, role-based access control (RBAC), database relationships, transactional voting integrity, and security against unauthorized tampering.

---

## 📌 Project Overview

In a fair digital election system:
1. **Voters** must be verified citizens who can cast exactly one vote.
2. **Candidates** represent a political party and cannot vote for themselves or alter counts.
3. **Admins** manage candidate records and monitor results, but **cannot cast votes or tamper with vote tallies**.
4. **Citizens authenticate using Aadhaar Card Number and Password**, keeping identification unique and realistic.

---

## 🚀 Key Features

- **Aadhaar-Based Authentication**: Secure login using 12-digit Aadhaar Card Number and password instead of generic usernames.
- **Three Strict & Mutually Exclusive Roles**:
  - `voter`: Can browse candidates, cast exactly 1 vote, view profile, and check live election results.
  - `candidate`: Linked to a unique party and User account. Cannot vote or modify vote counts.
  - `admin`: System-seeded single administrator account. Manages candidate profiles, cannot vote, and cannot alter vote tallies.
- **Role Immutability**: No public API permits changing roles (a voter cannot turn into an admin or candidate).
- **Public Admin Creation Prevention**: Signup API rejects any attempt to register with `role: "admin"`.
- **Tamper-Proof Voting**:
  - Voters can only vote once (`isVoted` flag enforced in database).
  - Voting route atomically increments `voteCount` by 1 and records voter timestamp.
  - Direct modification of `voteCount` or `votes` array is blocked on all candidate update endpoints.
- **Password Security**: Passwords are never stored in plain text; hashed using `bcryptjs` with salt factor 10.
- **Stateless JWT Authorization**: Requests are authenticated via `Bearer <token>` headers, with custom role middleware (`adminOnly`, `voterOnly`).

---

## 🛠️ Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **Node.js** | JavaScript runtime environment |
| **Express.js** | REST API framework and routing |
| **MongoDB** | NoSQL document database |
| **Mongoose** | ODM (Object Data Modeling) library for MongoDB |
| **JSON Web Token (JWT)** | Stateless user authentication and authorization |
| **bcryptjs** | Password salting and hashing algorithm |
| **dotenv** | Environment variable management |

---

## 📂 Project Structure

```text
voting-app/
├── config/
│   └── db.js                 # MongoDB connection using Mongoose
├── middleware/
│   └── authMiddleware.js     # JWT verification, adminOnly & voterOnly middleware
├── models/
│   ├── user.js               # User schema (voter, candidate, admin) with bcrypt hooks
│   └── candidates.js         # Candidate schema linked to User via userId
├── routes/
│   ├── authRoutes.js         # Signup (voter/candidate) & Aadhaar Login
│   ├── candidateRoutes.js    # Candidate browsing & Admin CRUD operations
│   ├── voteRoutes.js         # Secure voting & Election results
│   ├── userRoutes.js         # User profile & Password change
│   └── resultRoutes.js       # Election results endpoint
├── scripts/
│   └── seedAdmin.js          # Secure one-time Admin creation script
├── .env                      # Environment configurations (ignored in git)
├── .gitignore                # Git ignore configuration
├── package.json              # Project dependencies and npm scripts
├── server.js                 # Main Express server entry point
└── testVerification.js       # Automated 21-scenario testing suite
```

---

## 👥 User Roles & Permissions

| Action / Permission | Voter | Candidate | Admin |
| :--- | :---: | :---: | :---: |
| Self-Register via `/signup` | ✅ | ✅ | ❌ (Seeded Only) |
| Login via Aadhaar + Password | ✅ | ✅ | ✅ |
| View Candidates List | ✅ | ✅ | ✅ |
| Cast a Vote (Once) | ✅ | ❌ | ❌ |
| View Election Results | ✅ | ✅ | ✅ |
| View Personal Profile | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ |
| Add / Delete Candidates | ❌ | ❌ | ✅ |
| Edit Candidate Info | ❌ | ❌ | ✅ (Name/Age/Party only) |
| Edit `voteCount` Directly | ❌ | ❌ | ❌ (Forbidden for all) |

---

## 🔄 Core Workflows

### 1. Voting Flow
```text
Client Request: POST /api/vote/:candidateId
        │
        ▼
Verify JWT Token & Extract req.user.id
        │
        ▼
Check User Exists in Database
        │
        ▼
Is User Role == "voter"?
   ├── NO (Candidate / Admin) ──► 403 Forbidden ("Candidates/Admins are not allowed to vote")
   └── YES
        │
        ▼
Has User Already Voted? (user.isVoted == true)
   ├── YES ─────────────────────► 400 Bad Request ("You have already voted")
   └── NO
        │
        ▼
Find Candidate by candidateId
        │
        ▼
Add vote record to candidate.votes array
Increment candidate.voteCount by 1
Set user.isVoted = true
Save candidate & user to MongoDB
        │
        ▼
Return 200 OK ("Vote recorded successfully")
```

### 2. Candidate Creation Flow
- A user selects `role: "candidate"` and enters their `party` during signup (`POST /api/auth/signup`).
- The system creates the `User` and automatically creates a linked `Candidate` document containing `userId: user._id`.
- Each user can only link to **one candidate document** (`userId` unique constraint).
- Each candidate can only belong to **one party** (`party` unique constraint).

---

## 📡 API Endpoints Reference

### 1. Authentication (`/api/auth`)

#### Register User
- **Method:** `POST`
- **URL:** `/api/auth/signup`
- **Body (Voter):**
```json
{
  "name": "Rahul Sharma",
  "age": 24,
  "mobile": "9876543210",
  "email": "rahul@example.com",
  "address": "Delhi, India",
  "aadharCardNumber": "123456789012",
  "password": "mypassword123",
  "role": "voter"
}
```
- **Body (Candidate):**
```json
{
  "name": "Priya Verma",
  "age": 35,
  "mobile": "9876543211",
  "email": "priya@example.com",
  "address": "Mumbai, India",
  "aadharCardNumber": "987654321098",
  "password": "mypassword123",
  "role": "candidate",
  "party": "Democratic Alliance"
}
```

#### User Login
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Body:**
```json
{
  "aadharCardNumber": "123456789012",
  "password": "mypassword123"
}
```
- **Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "67...a1",
    "name": "Rahul Sharma",
    "role": "voter",
    "isVoted": false
  }
}
```

---

### 2. Voting (`/api/vote`)

#### Cast Vote
- **Method:** `POST`
- **URL:** `/api/vote/:candidateId`
- **Headers:** `Authorization: Bearer <VOTER_JWT_TOKEN>`
- **Response:**
```json
{
  "message": "Vote recorded successfully",
  "candidate": "Priya Verma",
  "party": "Democratic Alliance"
}
```

#### Get Election Results / Vote Counts
- **Method:** `GET`
- **URL:** `/api/vote/counts`
- **Public:** Yes
- **Response:**
```json
{
  "results": [
    {
      "_id": "67...b2",
      "name": "Priya Verma",
      "party": "Democratic Alliance",
      "voteCount": 12
    }
  ]
}
```

---

### 3. Candidates (`/api/candidates`)

#### Get All Candidates
- **Method:** `GET`
- **URL:** `/api/candidates`
- **Public:** Yes

#### Get Single Candidate
- **Method:** `GET`
- **URL:** `/api/candidates/:id`
- **Public:** Yes

#### Admin Update Candidate
- **Method:** `PUT`
- **URL:** `/api/candidates/:candidateId`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Body:**
```json
{
  "name": "Priya Verma",
  "age": 36
}
```
*(Note: Any `voteCount` or `votes` field sent in this request is automatically stripped to prevent tampering).*

#### Admin Delete Candidate
- **Method:** `DELETE`
- **URL:** `/api/candidates/:candidateId`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

### 4. User Profile (`/api/profile`)

#### Get Profile
- **Method:** `GET`
- **URL:** `/api/profile`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

#### Change Password
- **Method:** `PUT`
- **URL:** `/api/profile/password`
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Body:**
```json
{
  "currentPassword": "mypassword123",
  "newPassword": "newsecretpassword"
}
```

---

## 🔒 Security Best Practices Implemented

1. **No Plaintext Passwords**: Mongoose `pre("save")` automatically salts and hashes passwords using `bcryptjs`.
2. **Untrusted Client Inputs**:
   - `role: "admin"` is strictly blocked in public registration.
   - `voteCount` is never accepted from request bodies.
3. **Double-Vote Prevention**: `user.isVoted` is checked before casting and set to `true` upon vote recording.
4. **Role Segregation**: Candidates and Admins cannot vote or register as voters.
5. **Private Data Protection**: Voter IDs inside candidate vote records are hidden from public API responses.
6. **Environment Separation**: Sensitive database connection strings and JWT secrets are kept in `.env` and excluded from git.

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or a MongoDB Atlas URI)
- [Postman](https://www.postman.com/) (for API testing)

### Step 1: Clone and Install
```bash
git clone <your-repository-url>
cd voting-app
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/voting-app
JWT_SECRET=your_jwt_secret_key_here
```

### Step 3: Seed the Admin Account
Since admins cannot register through the public API, run the seed script to create the single Admin account:
```bash
npm run seed:admin
```
*Default seeded admin credentials:*
- **Aadhaar Number:** `000000000000`
- **Password:** `adminpassword123`

### Step 4: Run the Application
```bash
npm start
```
The server will start at `http://localhost:3000`.

---

## 🧪 Automated Testing

An automated test suite covering all 21 core functional and security scenarios is included:

```bash
npm test
```

### Tests Covered:
1. User can register as voter.
2. User can register as candidate.
3. User cannot register as admin through public signup.
4. Candidate cannot register again.
5. Voter cannot become candidate after registration.
6. Candidate cannot become voter after registration.
7. Voter can login using Aadhaar + password.
8. Candidate can login using Aadhaar + password.
9. Admin can login.
10. Voter can view candidates.
11. Voter can vote once.
12. Same voter cannot vote twice.
13. Candidate cannot vote.
14. Admin cannot vote.
15. Admin can view/manage candidates.
16. Admin cannot modify voteCount directly.
17. Candidate cannot modify voteCount.
18. Voter cannot modify voteCount.
19. Vote count increases only after a successful vote.
20. Candidate belongs to only one party.
21. Candidate cannot create multiple candidate records.

---

## 📬 Postman Testing Guide

1. **Seed Admin**: Run `npm run seed:admin` in terminal.
2. **Login as Admin**: Send `POST /api/auth/login` with Aadhaar `000000000000` and password `adminpassword123`. Copy the returned `token`.
3. **Register Candidate**: Send `POST /api/auth/signup` with role `"candidate"` and a `"party"` name.
4. **Register Voter**: Send `POST /api/auth/signup` with role `"voter"` and an Aadhaar number. Copy the returned `token`.
5. **View Candidates**: Send `GET /api/candidates` to get the `candidateId`.
6. **Cast Vote**: Send `POST /api/vote/:candidateId` with `Authorization: Bearer <VOTER_TOKEN>`.
7. **Verify Results**: Send `GET /api/vote/counts` to see the live vote count incremented by 1!
