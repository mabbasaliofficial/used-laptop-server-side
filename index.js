const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ay7prkh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoryCollection = client.db("laptopShowcase").collection("productsCategory");
    const productsCollection = client.db("laptopShowcase").collection("products");
    const buyingCollection = client.db("laptopShowcase").collection("buying");
    const usersCollection = client.db("laptopShowcase").collection("users");
    const paymentsCollection = client.db("laptopShowcase").collection("payment");

    app.get("/productsCategory", async (req, res) => {
      const query = {};
      const options = await categoryCollection.find(query).toArray();
      res.send(options);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });
    app.get('/product', async(req, res)=> {
      const email = req.query.email;
      const query = { email: email };
      const products = await productsCollection.find(query).toArray();
      res.send(products)
    })
    app.get('/advertizeproducts', async (req, res)=> {
      const query = {advertize: "advertized"};
      const products = await productsCollection.find(query).toArray();
      res.send(products)
    })
    app.post('/product', async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    app.put('/product/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          advertize: "advertized",
        },
      };
      const result = await productsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });
    app.delete('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await productsCollection.deleteOne(query);
      res.send(result)
    });

    app.get("/buying", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const buying = await buyingCollection.find(query).toArray();
      res.send(buying);
    });

    app.get('/buying/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await buyingCollection.findOne(query);
      res.send(product);

    })

    app.post("/buying", async (req, res) => {
      const buying = req.body;
      const result = await buyingCollection.insertOne(buying);
      res.send(result);
    });

    app.post('/create-payment-intent', async(req, res)=> {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        'payment_method_types': [
          'card'
        ],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    })

    app.post('/payments', async(req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const id = payment.bookingId;
      const filter = {_id: ObjectId(id)}
      const updateDoc= {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }
      const updateResult = await buyingCollection.updateOne(filter, updateDoc)
      
      res.send(result)
    })

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "1h" });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.put("/users/admin/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get('/seller', async (req, res) => {
      const query = {role: 'seller'};
      const seller = await usersCollection.find(query).toArray();
      res.send(seller);
    });

    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    app.get('/seller/verify/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    })

    app.put("/users/seller/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verify: "verified",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get('/buyer', async (req, res) => {
      const query = {role: 'buyer'};
      const buyer = await usersCollection.find(query).toArray();
      res.send(buyer);
    });

    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });

    
    app.put("/users/buyer/:id", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verify: "verified",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
