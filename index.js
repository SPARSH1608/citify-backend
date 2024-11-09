const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
// const connectToDatabase = require('./db/connect');
const Connectdb = require('./db/connect');
require('dotenv').config();
const User = require('./models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = process.env.SECRET_KEY;
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const Post = require('./models/Post');
const allowMethods = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'];
const allowHeaders = [
  'Content-Type',
  'Authorization',
  'X-Content-Type-Options',
  'Accept',
  'X-Requested-With',
  'Origin',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
];

app.use(
  cors({
    credentials: true,
    origin:
      'https://citify-frontend-jvme-p41yueihu-sparsh1608s-projects.vercel.app/',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  })
);
app.options('*', (req, res) => {
  console.log('preflight');
  if (
    req.headers.origin ===
      'https://citify-frontend-jvme-p41yueihu-sparsh1608s-projects.vercel.app/' &&
    allowMethods.includes(req.headers['access-control-request-method']) &&
    allowHeaders.includes(req.headers['access-control-request-headers'])
  ) {
    console.log('pass');
    return res.status(204).send();
  } else {
    console.log('fail');
  }
});
app.use(
  cors({
    credentials: true,
    origin:
      'https://citify-frontend-jvme-p41yueihu-sparsh1608s-projects.vercel.app/',
  })
);

app.use(express.json()); // to get req bbdoy
app.use(cookieParser()); //to parse cookie
app.use('/uploads', express.static(__dirname + '/uploads'));
const salt = bcrypt.genSaltSync(10);

mongoose.connect(
  'mongodb+srv://sparshgoelk:8dpl7GIr9wAGvtfO@cluster0.kkogtln.mongodb.net/citify?retryWrites=true&w=majority'
);

app.listen(process.env.PORT, (PORT) => {
  console.log('server is running');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddleware.single('file'), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.' + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path + '.' + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });
});

app.get('/post', async (req, res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
});
