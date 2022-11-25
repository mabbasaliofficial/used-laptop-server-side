const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;

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

async function run() {
  try {
    const productsCollection = client.db("laptopShowcase").collection("productsCategory");
    app.get("/productsCategory", async (req, res) => {
      const query = {};
      const options = await productsCollection.find(query).toArray();
      res.send(options);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = {};
      const category_products = news.filter((n) => n.category_id === id);
      res.send(category_products);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
