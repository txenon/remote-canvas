var userHash = {};

io.on('connection', function(socket) {
  console.log('a user connected');
  console.log(socket.id);

  // 誰か一人にcanvasデータを送ってもらおう。レスポンスがsetTimeoutまでにこなければ次の人へ
  // その間新しいユーザーはloadingのくるくるまわる画面を出すのは必要ない
  // socket.idの配列(userHashのキー)を取り出す必要あり
  // 誰もいないときは？false処理調べる

  // そもそも人がいるか？人がいなければ、処理の必要なし。
  // その人がdisconnectedになってないか？

  // 新しいユーザーがつながると

  socket.on("connected", function(canvas_id){
    // ルームに参加させる
    socket.join(canvas_id);

    // 同じCanvasにいる人たちのリストを作成(new user自身は含めず)
    var canvasSocketIdList = [];
    for(var key in userHash){
      if(userHash[key] == canvas_id){
        canvasSocketIdList.push(key);
      }
    }

    console.log("a user entered Room " + canvas_id);
    console.log("Room " + canvas_id + " has " + (canvasSocketIdList.length + 1) + " users");

    // まず即座にrequest for canvas data 生存確認してもいい
    if(canvasSocketIdList.length >= 2) {
      io.to(canvasSocketIdList[1]).emit("get canvas data", socket.id);
      io.to(canvasSocketIdList[0]).emit("get canvas data", socket.id);
    } else if (canvasSocketIdList.length == 1) {
      io.to(canvasSocketIdList[0]).emit("get canvas data", socket.id);
    }

    // 新規ユーザーへ
    io.to(socket.id).emit("connected", [canvasSocketIdList, canvasSocketIdList.length + 1]);
    // initialize userID for new user and update userHash
    // var userId = 'id' + socket.id.replace(/\W/g, '').slice(-4);
    userHash[socket.id] = canvas_id;
    io.to(socket.id).emit("know my socket id", socket.id);
    // 前からいたユーザーたちへ
    var tempSocketIdList = [socket.id];
    socket.broadcast.to(canvas_id).emit("connected", [tempSocketIdList, canvasSocketIdList.length + 1]);
  });

  socket.on("get canvas data", function(data) {
    // キャンバスサイズも一緒に伝える、向こうでサイズ設定して先でも後でも描画
    io.to(data[1]).emit("render canvas", data[0]);
  });

  socket.on('disconnect', function() {
    console.log("user disconnected from Room " + userHash[socket.id]);
    socket.broadcast.to(userHash[socket.id]).emit("user disconnected", socket.id);
    // errorでる?
    // console.log("The last person left from the room. The room deleted.");
    delete userHash[socket.id];
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
    var base64Data = data[0].replace(/^data:image\/png;base64,/, "");
    var time = timestamp();
    Canvas.findById(data[1], function(err, canvas) {
      if (err) throw err;
      if(canvas.filename == ""){
        var oldFilepath = "public/images/" + time + ".png";
      } else {
        var oldFilepath = "public/images/" + canvas.filename;
      }
      var newFilepath = "public/images/" + time + ".png";
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
            io.sockets.to(data[1]).emit("msgBox", "Autosaved");
        });
      });
    });
    // console.log("image saved on server");
    // socket.emit("download image", filepath.substr(7));
  });
});

function timestamp() {
  var now = new Date();
  var time = now.getFullYear();
  time += ("0" + (now.getMonth() + 1)).slice(-2);
  time += ("0" + now.getDate()).slice(-2);
  time += ("0" + now.getHours()).slice(-2);
  time += ("0" + now.getMinutes()).slice(-2);
  time += ("0" + now.getSeconds()).slice(-2);
  return time;
}