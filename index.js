const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Ensure ObjectId is imported
const jwt = require("jsonwebtoken");
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


// verify seller
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  if(user?.role !== 'seller'){
      return res.send({message: 'Forbidden Access'});
  }
  next();
}

// MongoDB Connection
const url = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.zi8pxok.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Collections
const userCollection = client.db("Mr_Fashion").collection("users");
const productCollection = client.db('Mr_Fashion').collection('products');

const dbConnect = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas Successfully...!");

    // Add user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.status(200).send({
          message: "User already exists",
          user: existingUser,
        });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Get user by email
    app.get('/user/:email', async (req, res) => {
      const query = {email: req.params.email};
      const user = await userCollection.findOne(query);
      res.send(user);
  })

    // Update user role
    app.put("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const { role } = req.body;

      if (!role) {
        return res.status(400).send({ message: "Role is required" });
      }

      const query = { _id: new ObjectId(userId) };
      const update = { $set: { role } };
      const result = await userCollection.updateOne(query, update);

      if (result.modifiedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send(result);
    });

    // Delete user
    app.delete("/users/:id", async (req, res) => {
      const userId = req.params.id;
      const query = { _id: new ObjectId(userId) };
      const result = await userCollection.deleteOne(query);

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "User not found" });
      }
      res.send(result);
    });


    // add product
    app.post('/products',verifyJWT, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });



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
  const userEmail = req.body;
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
