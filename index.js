const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); 
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
const WishlistCollection = client.db('Mr_Fashion').collection('wishlists');

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

     // Get products by email
     app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = { sellerEmail: email };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });
    
    // Update product
    app.put("/products/:id", async (req, res) => {
      const productId = req.params.id;
      const { title, description, price, stock, category, brand } = req.body;
      
      if (!title ||!description ||!price ||!stock || !category || !brand) {
        return res.status(400).send({ message: "All fields are required" });
      }
      
      const query = { _id: new ObjectId(productId) };
      const update = {
        $set: { title, description, price, stock, category, brand },
      };
      const result = await productCollection.updateOne(query, update);
      
      if (result.modifiedCount === 0) {
        return res.status(404).send({ message: "Product not found" });
      }
      res.send(result);
    });

    // Delete product
    app.delete("/products/:id", async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) };
      const result = await productCollection.deleteOne(query);
      
      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Product not found" });
      }
      res.send(result);
    });


    // Get all products 
    app.get('/products', async (req , res) => {
      const { title, category, brand, sort } = req.query;
      const query = {};
  
      if (title) {
          query.title = { $regex: title, $options: 'i' };
      }
      if (category) {
          query.category = { $regex: category, $options: 'i' };
      }
      if (brand) {
          query.brand = brand;
      }
  
      const sortOptions = sort === 'asc' ? 1 : -1;
  
      const products = await productCollection.find(query).sort({ price: sortOptions }).toArray();
      
      const productsInfo = await productCollection.find({}, { projection: { category: 1, brand: 1 } }).toArray();
  
      const categories = [...new Set(productsInfo.map((product) => product.category))];
      const brands = [...new Set(productsInfo.map((product) => product.brand))];
  
      res.json({ products, brands, categories });
    });

    // Add wishlist
    app.post("/wishlists", async (req, res) => {
      const wishlist = req.body;
      const query = { email: wishlist.email, productId: wishlist.productId }; 
      const existingWishlist = await WishlistCollection.findOne(query);

      if (existingWishlist) {
        return res.status(200).send({
        message: "Wishlist already exists",
        wishlist: existingWishlist,
        });
      }

      const result = await WishlistCollection.insertOne(wishlist);
      res.send(result);
    });


    // Get wishlist by email 
    app.get("/wishlists/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const wishlists = await WishlistCollection.find(query).toArray();
      res.send(wishlists);
    });
    
    // Delete wishlist
    app.delete("/wishlists/:id", async (req, res) => {
      const wishlistId = req.params.id; 
      const query = { _id: new ObjectId(wishlistId) }; 
      const result = await WishlistCollection.deleteOne(query);

      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Wishlist not found" });
      }
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

// JWT Authentication 
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
