const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const Connectdb = require('./db/connect');
require('dotenv').config();
const User = require('./models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const secret = process.env.SECRET_KEY;
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddlerWare = multer({ dest: 'uploads/' });
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
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Authorization, X-Content-Type-Options, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  })
);
app.options('*', (req, res) => {
  console.log('preflight');
  if (
    req.headers.origin === 'http://localhost:5173' &&
    allowMethods.includes(req.headers['access-control-request-method']) &&
    allowHeaders.includes(req.headers['access-control-request-headers'])
  ) {
    console.log('pass');
    return res.status(204).send();
  } else {
    console.log('fail');
  }
});

app.use(express.json()); // to get req bbdoy
app.use(cookieParser()); //to parse cookie
app.use('/uploads', express.static(__dirname + '/uploads'));
const salt = bcrypt.genSaltSync(10);

mongoose.connect(process.env.MONGO_URL);

// const start = async () => {
//   try {
//     await Connectdb(process.env.MONGO_URI);
//     app.listen(4000, (PORT) => {
//       console.log('server is listening on port 4000');
//     });
//   } catch (error) {
//     console.log('error');
//   }
// };

app.listen(process.env.PORT, (PORT) => {
  console.log('server is running');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // res.json({ requestData: { username, password } });

  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });

    res.status(200).json(userDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username: username });

  if (!userDoc) {
    return res.status(400).json({ message: 'User not found' });
  }

  const passOK = bcrypt.compareSync(password, userDoc.password);

  if (passOK) {
    // Correct password
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) {
        console.error('Error signing JWT:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      res
        .cookie('token', token)
        .json({ id: userDoc._id, username: userDoc.username });
    });
  } else {
    res.status(400).json({ message: 'Wrong credentials' });
  }
});
app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('Error verifying token:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ info: decoded });
  });
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', uploadMiddlerWare.single('file'), async (req, res) => {
  try {
    // Process the request
    const { originalname, path } = req.file;

    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.' + ext;
    fs.renameSync(path, path + '.' + ext);

    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) {
        throw new Error({ message: 'invalid token' });
      }
      const { title, summary, content } = req.body;
      console.log(title, summary, content, newPath, info.id);
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });
      console.log(postDoc);
      res.json(postDoc);
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'Internal Server Error while creating post' });
  }
});

app.get('/post', async (req, res) => {
  const posts = await Post.find()
    .populate('author', ['username'])
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(posts);
});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id).populate('author', ['username']);
  res.json(post);
});

app.put('/postt/:id', uploadMiddlerWare.single('file'), async (req, res) => {
  try {
    let newPath = null;
    if (req.file) {
      const { originalname, path } = req.file;

      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      const newPath = path + '.' + ext;
      fs.renameSync(path, path + '.' + ext);
    }
    const { token } = req.cookies;
    jwt.verify(token, secret, {}, async (err, info) => {
      if (err) {
        throw new Error({ message: 'invalid token' });
      }
      const { id, title, summary, content, support } = req.body;
      const postDoc = await Post.findById(id);
      console.log(postDoc);
      // const isAuthor =
      //   JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      // const postDoc = await Post.create({
      //   title,
      //   summary,
      //   content,
      //   cover: newPath,
      //   author: info.i
      // if (!isAuthor) {
      //   res.status(400).json('Invalid Author');
      //   throw new Error({ message: 'Invalid Author' });
      // }
      await postDoc.updateOne({
        title,
        summary,
        content,
        cover: newPath ? newPath : postDoc.cover,
        support,
      });
      console.log(postDoc);
      res.json(postDoc);
    });

    // res.status(200).json({ text: 4, files: req.file });
  } catch (error) {
    console.log('Error while updating post');
  }
});
