const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken"); // Import jsonwebtoken
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// Token Verification Middleware
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "No Token" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_JWT_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid Token" });
    }
    req.decoded = decoded;
    next();
  });
};

// MongoDB Connection
const url = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.zi8pxok.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const dbConnect = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas Successfully...!");
  } catch (error) {
    console.error(error.name, error.message);
  }
};

dbConnect();

// Routes
app.get("/", (req, res) => {
  res.send("Mr. Fashion Server is running..!");
});

// JWT Authentication Endpoint
app.post("/authentication", async (req, res) => {
  const userEmail = req.body; // Ensure req.body contains { email: userEmail }
  try {
    const token = jwt.sign(userEmail, process.env.ACCESS_JWT_TOKEN, {
      expiresIn: "10d",
    });
    res.send({ token });
  } catch (error) {
    res.status(500).send({ message: "Failed to generate token", error: error.message });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Mr. Fashion Server is running on port ${port}`);
});
