const { default: mongoose } = require("mongoose");
require("dotenv").config();
const port = process.env.PORT;
const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const mpngoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { error, log } = require("console");
const { type } = require("os");

app.use(express.json());
app.use(cors());
//database connection mogodab Altess
require("dotenv").config();
mongoose.connect(process.env.MON_DB);

//API creation
app.get("/", (req, res) => {
  res.send("Express App Running");
});

//Imagwe storage Engin

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//creating end point for images
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://e-backend-jkn8.onrender.com/images/${req.file.filename}`,
  });
});

//shema for creating product

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    require: true,
  },
  name: {
    type: String,
    require: true,
  },
  category: {
    type: String,
    require: true,
  },
  new_price: {
    type: Number,
    require: true,
  },
  old_price: {
    type: Number,
    require: true,
  },
  date: {
    type: Date,
    default: Date.now,
    require: true,
  },
  avilable: {
    type: Boolean,
    default: true,
  },
  image: {
    type: String,
    require: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let product_last_array = products.slice(-1);
    let last_product = product_last_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("Saved");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// craeting Api for deleting products
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creating api gor getting all products
app.get("/getallproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("Feched all products");
  res.send(products);
});

//shema creating for users
const Users = mongoose.model("Users", {
  name: { type: String, require: true },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    require: true,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
//creating endpoints resigration for user
app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, errors: "exising email found" });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  let user = new Users({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };
  const token = jwt.sign(data, process.env.JWT_SECRET);
  res.json({ success: true, token });
});
//creating endponits for the login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const comparePass = req.body.password === user.password;
    if (comparePass) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Worng password" });
    }
  } else {
    res.json({ success: false, errors: "Worng Email Id" });
  }
});

//creating endpoints for newcollection
app.get("/newcollection", async (req, res) => {
  let Products = await Product.find({});
  let newcollection = Products.slice(1).slice(-8);
  console.log("fechednew collections");
  res.send(newcollection);
});

//creating end points for the popular  women product
app.get("/popularinwomen", async (req, res) => {
  let produts = await Product.find({ category: "women" });
  let poularinwomen = produts.slice(1).slice(-4);
  console.log("populae in wome produccts fatched");
  res.send(poularinwomen);
});
//creaing middleware for auth user
const fechUser = async (req, res, next) => {
  const token = req.header("Auth-token");
  if (!token) {
    res.status(401).json({ errors: "please authuating valid user token" });
  } else {
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      req.user = data.user;
      next();
    } catch (error) {
      res.status(4001).send({ errors: "please authuating valid user token" });
    }
  }
};

// creating end points for adding product in cart
app.post("/addtocart", fechUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

// creatinf end points to remove product from cardata

app.post("/removefromcart", fechUser, async (req, res) => {
  console.log("Removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

// creating endpoints to get cart data
app.post("/getcart", fechUser, async (req, res) => {
  console.log("GetCart", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData); // Sending response back to the client
});

//main database start dont touched
app.listen(port, (error) => {
  if (!error) {
    console.log("server running successfully on this port" + port);
  } else {
    console.log("Error" + error);
  }
});
