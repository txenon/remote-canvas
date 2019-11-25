const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Init App
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');

// mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/canvas');
let db = mongoose.connection;

// Check connection
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// Check for DB errors
db.on('error', () => {
    console.log(err);
});

// Bring in Models
let Canvas = require('./models/canvas');

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

// Home Route
app.get('/', (req, res) => {
  Canvas.find({}, (err, canvases) => {
      if (err) res.send(err);
      res.render('index', { canvases: canvases });
  });
});

// Route Files
let canvases = require('./routes/canvases');
app.use('/canvases', canvases);

// socket.io
io.on('connect', (socket) => {
  // 新メンバーが参加したら、Autosaveしてサーバーからダウンロードするのがシンプル。誰もいないときのfalse処理もこれでOK。
  // その間新しいユーザーはloadingのくるくるまわる画面を出す？
  // buffer canvas
  let canvas_id = socket.handshake.headers.referer.split('/').pop();
  socket.join(canvas_id);

  let users = [];

  new Promise((resolve, reject) => {
    io.in(canvas_id).clients((err, clients) => {
      if(err) throw err;
      users = Object.assign([], clients);
      resolve();
    });
  })
  .then(() => {
    console.log(users);
    console.log("a user " + socket.id + " entered Room " + canvas_id);
    console.log("Room " + canvas_id + " has " + (users.length) + " users");

    // 新規ユーザーへ
    io.to(socket.id).emit("connected", [users, users.length]);
    // 前からいたユーザーたちへ
    socket.broadcast.to(canvas_id).emit("connected", [[socket.id], users.length]);
    
    if(users.length > 1){
      users.some((v, i) => {
        if(v != socket.id){
          socket.to(users[i]).emit("get canvas data", socket.id);
        }
      });
    }
  })
  .catch(() => {
    console.log('Something wrong');
  });

  socket.on("get canvas data", function(data) {
    // キャンバスサイズも一緒に伝える、向こうでサイズ設定して先でも後でも描画
    io.to(data[1]).emit("render canvas", data[0]);
  });

  socket.on('disconnect', function() {
    console.log("user disconnected from Room " + canvas_id);
    socket.broadcast.to(canvas_id).emit("user disconnected", socket.id);
  });

  socket.on('canvas', function(data){
    socket.broadcast.to(data[1]).emit('canvas', data[0]);
  });

  socket.on('clear', function(canvas_id){
    socket.broadcast.to(canvas_id).emit('clear', {});
  });

  socket.on('undo', function(canvas_id) {
    socket.broadcast.to(canvas_id).emit('undo', socket.id);
  });

  socket.on("fetch canvas data", function(undoSocket) {
    io.to(undoSocket).emit("get canvas data", socket.id);
  });

  socket.on("save image to server", function(data){
    let base64Data = data[0].replace(/^data:image\/png;base64,/, "");
    let time = timestamp();
    Canvas.findById(data[1], function(err, canvas) {
      if(err) throw err;
      if(canvas === null){
        console.log("Canvas forced to shut down.");
        io.to(canvas_id).emit("redirect", '/');
        return false;
      }
      let oldFilepath;
      if(canvas.filename == ""){
        oldFilepath = "public/images/" + time + ".png";
      } else {
        oldFilepath = "public/images/" + canvas.filename;
      }
      let newFilepath = "public/images/" + time + ".png";
      fs.writeFile(oldFilepath, base64Data, 'base64', function(err) {
        if(err) throw err;
        fs.rename(oldFilepath, newFilepath, function(err){
            if(err) throw err;
            console.log("Img successfully renamed.");
        });
        canvas.filename = time + ".png";
        canvas.save(function(err) {
            if (err) throw err;
            console.log("Canvas updated!");
            io.to(data[1]).emit("msgBox", "Autosaved");
        });
      });
    });
    // console.log("image saved on server");
    // socket.emit("download image", filepath.substr(7));
  });
});

function timestamp() {
  let now = new Date();
  let time = now.getFullYear();
  time += ("0" + (now.getMonth() + 1)).slice(-2);
  time += ("0" + now.getDate()).slice(-2);
  time += ("0" + now.getHours()).slice(-2);
  time += ("0" + now.getMinutes()).slice(-2);
  time += ("0" + now.getSeconds()).slice(-2);
  return time;
}

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log("Server listening on port " + port);
});
